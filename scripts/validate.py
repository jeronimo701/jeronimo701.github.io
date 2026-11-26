from pathlib import Path
from urllib.parse import urlparse
from html.parser import HTMLParser
import datetime,json
ROOT=Path(__file__).resolve().parents[1]
def main():
    data=json.loads((ROOT/'site/catalog.json').read_text('utf-8'))
    ids=[p['id'] for p in data['projects']]
    assert ids and len(ids)==len(set(ids)), 'Empty or duplicate catalogue'
    datetime.datetime.fromisoformat(data['generatedAt'])
    def safe_url(value):
        u=urlparse(value)
        assert u.scheme=='https' and u.netloc=='github.com' and u.path.startswith('/jeronimo701/'),value
    for p in data['projects']:
        assert p['title'] and p['description'] and p['platforms']
        assert p['id']!='jeronimo701.github.io'
        assert all(x in ['windows','android','scripts','switch','other'] for x in p['platforms'])
        assert all(x in ['windows','android','scripts','switch','other'] for x in p.get('collections',p['platforms']))
        safe_url(p['url'])
        if p['latest']:
            assert p['latestUrl']==p['url']+'/releases/latest'
            safe_url(p['latest']['url'])
            for asset in p['latest']['assets']:
                safe_url(asset['url']);assert asset['size']>=0
            if len(p['platforms'])>1:
                for channel in p['channels']:
                    safe_url(channel['url']);assert channel['platform'] in p['platforms']
    class Links(HTMLParser):
        def handle_starttag(self, tag, attrs):
            attrs=dict(attrs)
            value=attrs.get('src') if tag=='script' else attrs.get('href') if tag=='link' else None
            if value and not value.startswith(('http','#','data:')):
                assert (ROOT/'site'/value.lstrip('/')).is_file(),value
    for html in ['index.html','404.html']:
        Links().feed((ROOT/'site'/html).read_text('utf-8-sig'))
    assert (ROOT/'site/assets/social.png').read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
    print(f'PASS: {len(ids)} public projects; release URLs, platform channels, assets and HTML resources valid')
if __name__=='__main__':main()
