"""Build a public-only catalogue using GitHub's public user repository endpoint."""
from __future__ import annotations
import argparse, concurrent.futures, datetime, json, os, pathlib, subprocess, time, urllib.request, urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
OWNER='jeronimo701'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--gh-path');args=parser.parse_args()
    def api(endpoint, optional=False):
        for attempt in range(3):
            try:
                if args.gh_path:
                    proc=subprocess.run([args.gh_path,'api',endpoint],capture_output=True,encoding='utf-8',timeout=90)
                    if proc.returncode:
                        if optional and '404' in proc.stderr:return None
                        raise RuntimeError(proc.stderr[:400])
                    return json.loads(proc.stdout)
                headers={'User-Agent':'jeronimo701-project-hub','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
                if os.environ.get('GITHUB_TOKEN'):headers['Authorization']='Bearer '+os.environ['GITHUB_TOKEN']
                with urllib.request.urlopen(urllib.request.Request('https://api.github.com/'+endpoint,headers=headers),timeout=60) as response:
                    return json.load(response)
            except urllib.error.HTTPError as error:
                if optional and error.code==404:return None
                if attempt==2:raise
            except (RuntimeError,TimeoutError,urllib.error.URLError,subprocess.TimeoutExpired):
                if attempt==2:raise
            time.sleep(2*(attempt+1))
    # /users/{owner}/repos only lists public repositories, even with an authenticated request.
    repos=[];page=1
    while True:
        batch=api(f'users/{OWNER}/repos?per_page=100&page={page}&type=owner&sort=full_name')
        repos.extend(batch)
        if len(batch)<100:break
        page+=1
    overrides=json.loads((ROOT/'projects.json').read_text('utf-8-sig'))
    def release_view(release):
        if not release:return None
        return {'tag':release['tag_name'],'name':release['name'] or release['tag_name'],'url':release['html_url'],'date':release['published_at'],'assets':[{'name':a['name'],'size':a['size'],'url':a['browser_download_url']} for a in release['assets'] if a['state']=='uploaded']}
    def project(repo):
        name=repo['name']; config=overrides.get(name,{})
        releases=api(f'repos/{OWNER}/{name}/releases?per_page=30')
        stable=sorted([x for x in releases if not x['draft'] and not x['prerelease']], key=lambda x:x['published_at'] or '', reverse=True)
        latest=api(f'repos/{OWNER}/{name}/releases/latest',optional=True)
        previews=sorted([x for x in releases if not x['draft'] and x['prerelease']], key=lambda x:x['published_at'] or '', reverse=True)
        preview=previews[0] if not latest and previews else None
        assert not latest or (not latest['draft'] and not latest['prerelease'])
        platforms=config.get('platforms',[])
        if not platforms:
            language=repo.get('language') or ''
            platforms=['scripts'] if 'tampermonkey' in (repo.get('description') or '').lower() else ['other']
        channels=[]
        # Separate OS releases can live in the same repository (e.g. KomandDok).
        if len(platforms)>1:
            for platform in platforms:
                extensions={'android':('.apk',),'windows':('.exe','.msi','.zip'),'switch':('.nro',)}.get(platform,())
                match=next((x for x in stable if any(a['name'].lower().endswith(extensions) for a in x['assets'])),None) if extensions else None
                if match:channels.append({'platform':platform,'url':match['html_url'],'tag':match['tag_name']})
        return {'id':name,'title':config.get('title',name),'description':repo.get('description') or 'Исходники и документация проекта.','platforms':platforms,'collections':config.get('collections',platforms),'category':config.get('category','Другое'),'icon':config.get('icon','terminal'),'color':config.get('color','blue'),'order':config.get('order',100),'note':config.get('note',''),'fork':repo['fork'],'archived':repo['archived'],'url':repo['html_url'],'latestUrl':repo['html_url']+'/releases/latest' if latest else None,'latest':release_view(latest),'preview':release_view(preview),'channels':channels,'updated':latest['published_at'] if latest else repo['pushed_at']}
    public=[x for x in repos if not x['private'] and x['name']!=OWNER+'.github.io']
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        projects=list(executor.map(project,public))
    projects.sort(key=lambda p:(p['order'],p['title'].casefold()))
    result={'owner':OWNER,'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'projects':projects}
    # Only minimal public metadata is emitted. No accounts, tokens or private repo names.
    dest=ROOT/'site/catalog.json';dest.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Catalogue: {len(projects)} public projects, {sum(bool(p["latest"]) for p in projects)} with stable releases')
if __name__=='__main__':main()
