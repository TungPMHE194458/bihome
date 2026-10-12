"""Tải ảnh demo (ảnh chụp thật) cho dữ liệu mẫu local vào backend/src/main/resources/demo-images/<loại>/<nhóm>-<n>.jpg.

Nguồn: Unsplash (https://unsplash.com/license — dùng miễn phí, kể cả thương mại, không cần ghi công) và
randomuser.me (ảnh chân dung dành cho dữ liệu giả). DemoImageSeeder (profile local) gắn ảnh theo nhóm; thêm / bớt ảnh
trong một nhóm thì sửa cả VARIANTS ở DemoImageSeeder.

Chạy: python backend/tools/download_demo_images.py
"""
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'src' / 'main' / 'resources' / 'demo-images'
UNSPLASH = 'https://images.unsplash.com/photo-{}?w=1024&h=576&fit=crop&crop=entropy&q=70&fm=jpg'
PORTRAIT = 'https://randomuser.me/api/portraits/{}.jpg'

PHOTOS = {
    'building': {
        'tower': ['1486406146926-c627a92ad1ab', '1545324418-cc1a3fa10c00'],
        'riverside': ['1460317442991-0ec209397118'],
        'compound': ['1567496898669-ee935f5f647a'],
        'classic': ['1574362848149-11496d93a7c7'],
        'lobby': ['1497366216548-37526070297c'],
        'city': ['1477959858617-67f85cf4f1df'],
    },
    'apartment': {
        'living': ['1502672260266-1c1ef2d93688', '1522708323590-d24dbb6b0267', '1493809842364-78817add7ffb', '1600607687939-ce8a6c25118c', '1600210492486-724fe5c67fb0'],
        'bedroom': ['1616594039964-ae9021a400a0', '1505693416388-ac5ce068fe85', '1631049307264-da0ec9d70304',
                    '1540518614846-7eded433c457'],
        'kitchen': ['1556911220-bff31c812dba', '1484154218962-a197022b5858'],
        'penthouse': ['1560448204-e02f11c3d0e2', '1586023492125-27b2c045efd7'],
        'villa': ['1564013799919-ab600027ffc6', '1600585154340-be6161a56a0c', '1613490493576-7fde63acd811',
                  '1580587771525-78b9dba3b914', '1512917774080-9991f1c4c750', '1600596542815-ffad4c1539a9'],
        'shophouse': ['1441986300917-64674bd600d8'],
    },
    'amenity': {
        'pool': ['1576013551627-0cc20b96c2a7', '1566073771259-6a8506099945'],
        'gym': ['1540497077202-7c8a3999166f', '1534438327276-14e5300c3a48'],
        'bbq': ['1555939594-58d7cb561ad1', '1529193591184-b1d58069ecdd'],
        'lounge': ['1519167758481-83f550bb49b3'],
    },
    'service': {
        'cleaning': ['1581578731548-c64695cc6952'],
        'sofa': ['1527515637462-cff94eecc1ac'],
        'repair': ['1621905251189-08b45d6a269e'],
        'laundry': ['1545173168-9f1947eebb7f'],
        'concierge': ['1497366216548-37526070297c'],
    },
}
PORTRAITS = {
    'male': ['men/32', 'men/45', 'men/52', 'men/75'],
    'female': ['women/44', 'women/65', 'women/68', 'women/90'],
}


def fetch(url, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'BiHome demo-data script'})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    if not data.startswith(b'\xff\xd8'):
        raise ValueError(f'Không phải JPEG: {url}')
    target.write_bytes(data)
    print(f'{target.relative_to(OUT)}  {len(data) // 1024} KB')


def main():
    for old in OUT.rglob('*.jpg'):
        old.unlink()
    for kind, groups in PHOTOS.items():
        for group, ids in groups.items():
            for n, photo_id in enumerate(ids, 1):
                fetch(UNSPLASH.format(photo_id), OUT / kind / f'{group}-{n}.jpg')
    for group, ids in PORTRAITS.items():
        for n, portrait in enumerate(ids, 1):
            fetch(PORTRAIT.format(portrait), OUT / 'resident' / f'{group}-{n}.jpg')


if __name__ == '__main__':
    main()
