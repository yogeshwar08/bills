"""
Generates 20 benchmark test images covering all 15 bill conditions and 5 non-bill conditions
for the Bill Snap evaluation pipeline.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

os.makedirs("evaluation/images/bills", exist_ok=True)
os.makedirs("evaluation/images/non_bills", exist_ok=True)

def get_font(size=18):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except:
        return ImageFont.load_default()

def draw_receipt_text(draw, lines, start_y=30, line_height=26, font=None):
    if font is None:
        font = get_font(18)
    y = start_y
    for line in lines:
        draw.text((30, y), line, fill=(20, 20, 20), font=font)
        y += line_height
    return y

# 1. Clear printed receipt
def make_bill_01():
    img = Image.new("RGB", (500, 700), (250, 250, 248))
    draw = ImageDraw.Draw(img)
    lines = [
        "================================",
        "      BLUE BOTTLE COFFEE        ",
        "        123 Main Street         ",
        "================================",
        "Date: 2024-10-12   Time: 09:14  ",
        "Order #48291                    ",
        "--------------------------------",
        "1x Cappuccino             $5.50 ",
        "1x Avocado Toast         $11.00 ",
        "Tax (8.5%)                $2.00 ",
        "--------------------------------",
        "TOTAL:                   $18.50 ",
        "================================",
        "Payment: VISA Ending in 9021    ",
        "Thank you for visiting!         "
    ]
    draw_receipt_text(draw, lines, start_y=50, line_height=35, font=get_font(20))
    img.save("evaluation/images/bills/bill_01.jpg", "JPEG")

# 2. Grocery bill
def make_bill_02():
    img = Image.new("RGB", (550, 800), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    lines = [
        "FRESH SUPERMARKET",
        "G.S.T. # 29AAAAA0000A1Z5",
        "Date: 2024-10-15  14:30:10",
        "Bill No: FS-99823",
        "-------------------------------------",
        "Items                      Qty  Price",
        "Organic Milk 1L              2  120.00",
        "Brown Bread 400g             1   45.00",
        "Farm Eggs 12pk               1  110.00",
        "Apples Royal Gala 1kg        1  160.00",
        "Subtotal:                       435.00",
        "CGST 2.5%:                        8.90",
        "SGST 2.5%:                        8.90",
        "-------------------------------------",
        "GRAND TOTAL:                   ₹452.80",
        "-------------------------------------",
        "Cash Received:                  500.00",
        "Change Due:                      47.20"
    ]
    draw_receipt_text(draw, lines, start_y=40, line_height=36, font=get_font(18))
    img.save("evaluation/images/bills/bill_02.jpg", "JPEG")

# 3. Restaurant bill
def make_bill_03():
    img = Image.new("RGB", (520, 750), (252, 250, 245))
    draw = ImageDraw.Draw(img)
    lines = [
        "    SPICE GARDEN BISTRO    ",
        "       Fine Dining         ",
        "Date: 2024-10-18  Table: 7 ",
        "Server: Rahul   Guests: 2  ",
        "---------------------------",
        "Paneer Tikka           380 ",
        "Butter Chicken         520 ",
        "Garlic Naan (2)        160 ",
        "Subtotal:             1060 ",
        "Service Charge (10%):  106 ",
        "VAT / GST:              84 ",
        "---------------------------",
        "TOTAL AMOUNT:      1250.00 ",
        "---------------------------",
        "Thank You, Please Visit Again"
    ]
    draw_receipt_text(draw, lines, start_y=40, line_height=40, font=get_font(19))
    img.save("evaluation/images/bills/bill_03.jpg", "JPEG")

# 4. Electricity bill
def make_bill_04():
    img = Image.new("RGB", (650, 850), (245, 248, 255))
    draw = ImageDraw.Draw(img)
    lines = [
        "CITY POWER SUPPLY LTD",
        "ELECTRICITY BILL & TAX INVOICE",
        "Consumer No: 0829103982",
        "Billing Date: 2024-10-01",
        "Due Date: 2024-10-16",
        "----------------------------------------",
        "Tariff: Residential Low Tension",
        "Previous Reading: 4120 kWh",
        "Current Reading:  4460 kWh",
        "Units Consumed:    340 kWh",
        "Energy Charges:             Rs 1980.00",
        "Fixed Meter Rent:           Rs  150.00",
        "Electricity Duty (9%):      Rs  210.00",
        "----------------------------------------",
        "NET TOTAL PAYABLE:          Rs 2340.00",
        "----------------------------------------"
    ]
    draw_receipt_text(draw, lines, start_y=50, line_height=44, font=get_font(20))
    img.save("evaluation/images/bills/bill_04.jpg", "JPEG")

# 5. Water bill
def make_bill_05():
    img = Image.new("RGB", (600, 750), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    lines = [
        "MUNICIPAL WATER BOARD",
        "Quarterly Water Supply Demand Note",
        "Bill Date: 2024-09-28",
        "Account: WTR-782190",
        "Water Consumption: 40,000 Litres",
        "Water Charge:               Rs 350.00",
        "Sewerage Charge:            Rs 100.00",
        "Arrears:                    Rs  30.00",
        "-------------------------------------",
        "TOTAL PAYABLE:              Rs 480.00",
        "Pay before 2024-10-25"
    ]
    draw_receipt_text(draw, lines, start_y=50, line_height=48, font=get_font(20))
    img.save("evaluation/images/bills/bill_05.jpg", "JPEG")

# 6. Internet bill
def make_bill_06():
    img = Image.new("RGB", (600, 800), (250, 252, 255))
    draw = ImageDraw.Draw(img)
    lines = [
        "AIRTEL BROADBAND",
        "Tax Invoice / Receipt",
        "Plan: Fiber Xstream 100 Mbps",
        "Invoice Date: 2024-10-05",
        "Billing Period: 05-Oct-2024 to 04-Nov-2024",
        "Monthly Rental:             Rs 846.61",
        "CGST 9%:                    Rs  76.19",
        "SGST 9%:                    Rs  76.20",
        "-------------------------------------",
        "TOTAL AMOUNT:               Rs 999.00",
        "Payment Status: PAID ONLINE"
    ]
    draw_receipt_text(draw, lines, start_y=50, line_height=48, font=get_font(20))
    img.save("evaluation/images/bills/bill_06.jpg", "JPEG")

# 7. Pharmacy bill
def make_bill_07():
    img = Image.new("RGB", (550, 750), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    lines = [
        "APOLLO PHARMACY",
        "Retail Medical Cash Memo",
        "Date: 2024-10-20  18:45",
        "Dr: Dr. S. K. Mehta",
        "---------------------------------",
        "Paracetamol 650mg (15s)    60.00",
        "Azithromycin 500mg (3s)   125.50",
        "Cough Syrup 100ml         140.00",
        "Vitamin C 500mg (20s)      60.00",
        "---------------------------------",
        "TOTAL AMOUNT:            ₹385.50",
        "Prescription Medicines Non-returnable"
    ]
    draw_receipt_text(draw, lines, start_y=40, line_height=42, font=get_font(19))
    img.save("evaluation/images/bills/bill_07.jpg", "JPEG")

# 8. Shopping invoice
def make_bill_08():
    img = Image.new("RGB", (600, 800), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    lines = [
        "DECATHLON SPORTS",
        "Retail Store Receipt",
        "Date: 2024-10-14  17:22",
        "Store: Bengaluru Whitefield",
        "------------------------------------",
        "Running Shoes Kalenji        1999.00",
        "Cotton Sports Socks (3pk)     299.00",
        "Water Bottle 750ml            201.00",
        "------------------------------------",
        "TOTAL:                       2499.00",
        "Paid by Credit Card:         2499.00",
        "Exchange within 30 days with receipt"
    ]
    draw_receipt_text(draw, lines, start_y=50, line_height=45, font=get_font(20))
    img.save("evaluation/images/bills/bill_08.jpg", "JPEG")

# 9. Handwritten bill
def make_bill_09():
    img = Image.new("RGB", (500, 650), (255, 250, 220)) # yellowish pad
    draw = ImageDraw.Draw(img)
    lines = [
        "GUPTA KIRANA STORE",
        "Cash Memo",
        "Date: 10/10/2024",
        "---------------------------",
        "Atta 5kg             180",
        "Sugar 2kg             90",
        "Tea 250g              50",
        "---------------------------",
        "Total:              Rs 320",
        "---------------------------",
        "Goods once sold not returned"
    ]
    draw_receipt_text(draw, lines, start_y=50, line_height=44, font=get_font(21))
    img.save("evaluation/images/bills/bill_09.jpg", "JPEG")

# 10. Crumpled bill (textured / shaded folds)
def make_bill_10():
    img = Image.new("RGB", (550, 750), (240, 240, 240))
    draw = ImageDraw.Draw(img)
    lines = [
        "METRO WHOLESALE",
        "Cash & Carry Invoice",
        "Date: 2024-10-08",
        "Invoice: MW-92180",
        "-----------------------------",
        "Basmati Rice 10kg     1150.00",
        "Sunflower Oil 5L       725.25",
        "-----------------------------",
        "TOTAL AMOUNT:        ₹1875.25",
        "Thank you for shopping!"
    ]
    draw_receipt_text(draw, lines, start_y=60, line_height=48, font=get_font(20))
    # Add fold lines
    draw.line([(0, 200), (550, 230)], fill=(180, 180, 180), width=3)
    draw.line([(0, 480), (550, 460)], fill=(180, 180, 180), width=4)
    draw.line([(250, 0), (280, 750)], fill=(190, 190, 190), width=2)
    img.save("evaluation/images/bills/bill_10.jpg", "JPEG")

# 11. Blurry bill (apply Gaussian blur)
def make_bill_11():
    img = Image.new("RGB", (500, 700), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    lines = [
        "STARBUCKS COFFEE",
        "Receipt #0912",
        "Date: 2024-10-22",
        "1x Caramel Macchiato    350.00",
        "------------------------------",
        "TOTAL:                  350.00",
        "Paid Cash"
    ]
    draw_receipt_text(draw, lines, start_y=80, line_height=50, font=get_font(22))
    img = img.filter(ImageFilter.GaussianBlur(radius=2.5))
    img.save("evaluation/images/bills/bill_11.jpg", "JPEG")

# 12. Angled photograph (perspective rotation)
def make_bill_12():
    img = Image.new("RGB", (500, 700), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    lines = [
        "BURGER KING",
        "Store #1042",
        "Date: 2024-10-16",
        "Whopper Meal Combo      350.00",
        "Cheesy Fries             70.00",
        "------------------------------",
        "TOTAL:                  420.00",
        "Thank You"
    ]
    draw_receipt_text(draw, lines, start_y=70, line_height=48, font=get_font(21))
    img = img.rotate(15, expand=True, fillcolor=(230, 230, 230))
    img.save("evaluation/images/bills/bill_12.jpg", "JPEG")

# 13. Low-light photograph (dimmed/underexposed)
def make_bill_13():
    img = Image.new("RGB", (500, 700), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    lines = [
        "NIGHT OWL DINER",
        "Late Night Food",
        "Date: 2024-10-19",
        "Loaded Nachos           320.00",
        "Cold Coffee             180.00",
        "Chicken Wings           180.00",
        "------------------------------",
        "TOTAL AMOUNT:           680.00"
    ]
    draw_receipt_text(draw, lines, start_y=60, line_height=50, font=get_font(21))
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(0.40) # deeply dim/low-light
    img.save("evaluation/images/bills/bill_13.jpg", "JPEG")

# 14. Long receipt
def make_bill_14():
    img = Image.new("RGB", (550, 1100), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    lines = [
        "HYPERCITY HYPERMARKET",
        "Tax Invoice - POS #12",
        "Date: 2024-10-03  11:20",
        "------------------------------------",
        "Rice 5kg                      350.00",
        "Cooking Oil 2L                280.00",
        "Detergent 2kg                 320.00",
        "Biscuits 4pk                  120.00",
        "Shampoo 350ml                 299.00",
        "Soap Pack of 4                180.00",
        "Toothpaste 2pk                150.00",
        "Almonds 500g                  450.00",
        "Cashews 250g                  280.00",
        "Juice Tetrapack               110.00",
        "Chips & Snacks                 90.00",
        "Cleaning Spray                160.00",
        "Subtotal:                    2789.00",
        "GST 18% & 5%:                 631.75",
        "------------------------------------",
        "FINAL TOTAL:                 3420.75",
        "------------------------------------"
    ]
    draw_receipt_text(draw, lines, start_y=40, line_height=42, font=get_font(18))
    img.save("evaluation/images/bills/bill_14.jpg", "JPEG")

# 15. Faded thermal receipt
def make_bill_15():
    img = Image.new("RGB", (500, 700), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Darker at top, fading to barely visible at bottom
    draw.text((30, 50), "RELIANCE RETAIL", fill=(50, 50, 50), font=get_font(22))
    draw.text((30, 90), "Date: 2024-09-15", fill=(90, 90, 90), font=get_font(18))
    draw.text((30, 130), "Fashion Apparel Store", fill=(120, 120, 120), font=get_font(18))
    draw.text((30, 180), "Cotton T-Shirt        599.00", fill=(150, 150, 150), font=get_font(18))
    draw.text((30, 230), "Socks Pair            216.00", fill=(180, 180, 180), font=get_font(18))
    draw.text((30, 300), "TOTAL AMOUNT:         815.00", fill=(210, 210, 210), font=get_font(20)) # very faded
    img.save("evaluation/images/bills/bill_15.jpg", "JPEG")

# 16. Selfie
def make_non_bill_16():
    img = Image.new("RGB", (500, 500), (220, 235, 245))
    draw = ImageDraw.Draw(img)
    # Draw simple portrait silhouette
    draw.ellipse([(175, 100), (325, 250)], fill=(235, 185, 150)) # head
    draw.ellipse([(100, 270), (400, 550)], fill=(60, 90, 140)) # shoulders/shirt
    draw.text((150, 420), "PORTRAIT SELFIE", fill=(255, 255, 255), font=get_font(22))
    img.save("evaluation/images/non_bills/non_bill_16.jpg", "JPEG")

# 17. ID Card
def make_non_bill_17():
    img = Image.new("RGB", (600, 380), (240, 245, 250))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([(30, 30), (570, 350)], radius=20, fill=(255, 255, 255), outline=(100, 140, 180), width=3)
    draw.rectangle([(60, 80), (180, 230)], fill=(190, 205, 220)) # photo placeholder
    draw.text((210, 70), "NATIONAL IDENTITY CARD", fill=(20, 40, 80), font=get_font(20))
    draw.text((210, 115), "Name: Rajesh Kumar", fill=(30, 30, 30), font=get_font(18))
    draw.text((210, 155), "DOB: 15/08/1995", fill=(30, 30, 30), font=get_font(18))
    draw.text((210, 195), "ID No: 9812-4019-3321", fill=(30, 30, 30), font=get_font(18))
    draw.text((210, 235), "Gender: Male", fill=(30, 30, 30), font=get_font(18))
    img.save("evaluation/images/non_bills/non_bill_17.jpg", "JPEG")

# 18. General screenshot
def make_non_bill_18():
    img = Image.new("RGB", (450, 700), (230, 235, 240))
    draw = ImageDraw.Draw(img)
    draw.rectangle([(0, 0), (450, 60)], fill=(7, 94, 84)) # messaging header
    draw.text((30, 20), "Family Group Chat (5 members)", fill=(255, 255, 255), font=get_font(18))
    # Chat bubbles
    draw.rounded_rectangle([(30, 120), (320, 180)], radius=12, fill=(255, 255, 255))
    draw.text((45, 135), "Are we meeting for dinner today?", fill=(20, 20, 20), font=get_font(16))
    draw.rounded_rectangle([(130, 220), (420, 280)], radius=12, fill=(220, 248, 198))
    draw.text((145, 235), "Yes, let's meet at 8 PM!", fill=(20, 20, 20), font=get_font(16))
    img.save("evaluation/images/non_bills/non_bill_18.jpg", "JPEG")

# 19. Personal photograph (landscape/nature)
def make_non_bill_19():
    img = Image.new("RGB", (600, 450), (135, 206, 235)) # sky
    draw = ImageDraw.Draw(img)
    draw.ellipse([(450, 50), (550, 150)], fill=(255, 220, 80)) # sun
    # mountains
    draw.polygon([(0, 450), (200, 200), (400, 450)], fill=(100, 120, 100))
    draw.polygon([(250, 450), (450, 250), (600, 450)], fill=(80, 100, 80))
    # grass
    draw.rectangle([(0, 380), (600, 450)], fill=(60, 160, 60))
    draw.text((180, 395), "NATURE LANDSCAPE PHOTO", fill=(255, 255, 255), font=get_font(18))
    img.save("evaluation/images/non_bills/non_bill_19.jpg", "JPEG")

# 20. General non-financial document (Certificate)
def make_non_bill_20():
    img = Image.new("RGB", (700, 500), (255, 253, 240))
    draw = ImageDraw.Draw(img)
    draw.rectangle([(25, 25), (675, 475)], outline=(180, 140, 60), width=4)
    draw.text((180, 60), "CERTIFICATE OF COMPLETION", fill=(50, 40, 20), font=get_font(24))
    draw.text((220, 120), "This certificate is awarded to", fill=(80, 80, 80), font=get_font(18))
    draw.text((250, 170), "Amitabh Sharma", fill=(20, 20, 20), font=get_font(26))
    draw.text((140, 240), "for successfully completing the course in Data Structures", fill=(60, 60, 60), font=get_font(18))
    draw.text((280, 300), "Date: 12-June-2024", fill=(80, 80, 80), font=get_font(16))
    draw.text((100, 400), "Director Signature", fill=(100, 100, 100), font=get_font(16))
    draw.text((480, 400), "Dean Signature", fill=(100, 100, 100), font=get_font(16))
    img.save("evaluation/images/non_bills/non_bill_20.jpg", "JPEG")

def main():
    print("Generating 20 benchmark test images...")
    make_bill_01()
    make_bill_02()
    make_bill_03()
    make_bill_04()
    make_bill_05()
    make_bill_06()
    make_bill_07()
    make_bill_08()
    make_bill_09()
    make_bill_10()
    make_bill_11()
    make_bill_12()
    make_bill_13()
    make_bill_14()
    make_bill_15()
    make_non_bill_16()
    make_non_bill_17()
    make_non_bill_18()
    make_non_bill_19()
    make_non_bill_20()
    print("All 20 test images generated in evaluation/images/")

if __name__ == "__main__":
    main()

