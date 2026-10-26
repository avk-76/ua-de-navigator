from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

out = Path(__file__).resolve().parent.parent / "output" / "playwright"
out.mkdir(parents=True, exist_ok=True)
lines = [
    "Jobcenter Musterstadt",
    "Schreiben vom 01.10.2026",
    "Bitte reichen Sie bis zum 15.11.2026",
    "Ihre Mietbescheinigung ein.",
    "Ein Kontoauszug ist nicht erforderlich.",
]
font = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 52)
image = Image.new("RGB", (1700, 850), "white")
draw = ImageDraw.Draw(image)
for i, line in enumerate(lines):
    draw.text((100, 80 + i * 125), line, fill="black", font=font)
image.save(out / "synthetic-letter.png")

pdf = canvas.Canvas(str(out / "synthetic-text.pdf"), pagesize=(595, 842))
pdf.setFont("Helvetica", 14)
for i, line in enumerate(lines):
    pdf.drawString(60, 760 - i * 36, line)
pdf.save()

pdf = canvas.Canvas(str(out / "synthetic-scan.pdf"), pagesize=(595, 842))
pdf.drawImage(ImageReader(image), 30, 400, width=535, height=268)
pdf.save()
print(out)
