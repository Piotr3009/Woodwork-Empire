"""Presentation-only contact boards; input files remain untouched RGBA renders."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'regenerated'/'previews'
MASTER=ROOT/'regenerated'/'masters-6x'
IVORY='#F2F0E6';INK='#163E31';MUTED='#607167';LINE='#D5D9CA';LIGHT='#E9EADC';ACCENT='#739780'
FONT=str(Path(__file__).resolve().parent/'fonts'/'DejaVuSans.ttf')
BOLD=str(Path(__file__).resolve().parent/'fonts'/'DejaVuSans-Bold.ttf')

def font(size,bold=False):return ImageFont.truetype(BOLD if bold else FONT,size)

def text(d,xy,value,size=24,bold=False,fill=INK):
    d.text(xy,value,font=font(size,bold),fill=fill)

def center(d,x,y,value,size=24,bold=False,fill=INK):
    f=font(size,bold);box=d.textbbox((0,0),value,font=f)
    d.text((x-(box[2]-box[0])/2,y),value,font=f,fill=fill)

def paste_alpha(board,image,xy):
    board.paste(image,(round(xy[0]),round(xy[1])),image)

def sanders():
    # All five machines and both views use precisely the same pixels-per-metre.
    items=[
        ('used','Używana','Stół, szlifierka orbitalna','i odkurzacz','2 × 1 × 1 m',136),
        ('budget','Budżetowa','Stół odciągowy','i dwie szlifierki','2 × 1 × 1,25 m',148),
        ('standard','Standard','Szlifierka taśmowa','krawędziowa','2 × 1 × 1,5 m',160),
        ('pro','Pro','Szlifierka przelotowa','ze stołami rolkowymi','3 × 2 × 1,75 m',220),
        ('industrial','Przemysłowa','Cztery sekcje szlifujące','do całych ram','6 × 2 × 2 m',304),
    ]
    scale=1.7;header=244;heights=[round(i[-1]*scale)+48 for i in items]
    board=Image.new('RGB',(1920,header+sum(heights)+74),IVORY);d=ImageDraw.Draw(board)
    text(d,(64,33),'WOODWORK EMPIRE TYCOON',19,True,fill=MUTED)
    text(d,(64,66),'Paczka 1 • podgląd 3D',52,True)
    text(d,(66,139),'Szlifierki · wspólna skala modeli · stała kamera dimetryczna 2:1',25,fill=MUTED)
    d.line((64,191,1856,191),fill=LINE,width=2)
    text(d,(66,209),'MASZYNA / WYMIARY',17,True,fill=MUTED)
    center(d,818,202,'Widok 0°',27,True)
    center(d,1530,202,'Widok 90°',27,True)
    y=header
    for i,((key,name,desc1,desc2,dims,_),rh) in enumerate(zip(items,heights)):
        cy=y+rh/2
        d.rounded_rectangle((65,cy-70,111,cy-24),radius=12,fill=LIGHT)
        center(d,88,cy-60,f'{i+1:02d}',20,True)
        text(d,(131,cy-70),name,30,True)
        text(d,(131,cy-21),desc1,21,fill=MUTED)
        text(d,(131,cy+9),desc2,21,fill=MUTED)
        text(d,(131,cy+55),dims,23,True)
        for angle,cx in [(0,818),(90,1530)]:
            img=Image.open(MASTER/str(angle)/f'sander.{key}.png').convert('RGBA')
            w,h=img.size;img=img.resize((round(w/6*scale),round(h/6*scale)),Image.Resampling.LANCZOS)
            paste_alpha(board,img,(cx-img.width/2,cy-img.height/2))
        y+=rh
        d.line((64,y,1856,y),fill=LINE,width=2)
    text(d,(65,y+24),'Oba ujęcia powstały przez obrót modeli 3D. Przezroczyste tło pokazano tutaj na jasnym podkładzie.',20,fill=MUTED)
    path=OUT/'Paczka-1-szlifierki-podglad-3D.png';board.save(path,optimize=True)
    return path


def cutters():
    board=Image.new('RGB',(1600,690),IVORY);d=ImageDraw.Draw(board)
    text(d,(56,27),'WOODWORK EMPIRE TYCOON',17,True,fill=MUTED)
    text(d,(56,60),'Paczka 1 • zestawy frezów',43,True)
    text(d,(58,122),'Wspólna walizka · kamera hali 2:1 · obrazki katalogowe 112 × 112 px',22,fill=MUTED)
    d.line((56,164,1544,164),fill=LINE,width=2)
    items=[('Sash','Sash','8 smukłych głowic','Profile i kontrprofile do szprosów i ślemion'),
           ('Casement','Casement','4 schodkowe głowice','Pary do profilu skrzydła i ościeżnicy'),
           ('Door','Drzwi','2 głowice i duża tarcza','Frez do płycin z długimi skośnymi nożami')]
    for i,(key,title,sub,detail) in enumerate(items):
        cx=300+500*i
        if i:d.line((cx-250,192,cx-250,638),fill=LINE,width=2)
        im=Image.open(MASTER/'0'/f'cutters{key}.standard.png').convert('RGBA')
        im=im.crop(im.getbbox())
        s=min(390/im.width,348/im.height)
        im=im.resize((round(im.width*s),round(im.height*s)),Image.Resampling.LANCZOS)
        paste_alpha(board,im,(cx-im.width/2,204+(348-im.height)/2))
        center(d,cx,571,title,29,True)
        center(d,cx,612,sub,21,True,fill=MUTED)
        center(d,cx,645,detail,17,fill=MUTED)
    path=OUT/'Paczka-1-frezy-podglad-3D.png';board.save(path,optimize=True)
    return path


if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    print(sanders());print(cutters())
