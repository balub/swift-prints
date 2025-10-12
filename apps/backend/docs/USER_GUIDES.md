# User Guides

## Overview

This document provides comprehensive guides for both customers and makers using the Swift Prints platform, covering all workflows from account creation to order completion.

## Customer Guide

### Getting Started

#### 1. Account Creation and Setup

**Creating Your Account:**

1. Visit the Swift Prints website
2. Click "Sign Up" and choose "Customer Account"
3. Enter your email address and create a secure password
4. Verify your email address through the confirmation link
5. Complete your profile with:
   - Full name
   - Shipping address
   - Phone number (optional)
   - Preferred communication settings

**Profile Management:**

- Access your profile through the user menu
- Update personal information anytime
- Manage multiple shipping addresses
- Set notification preferences
- View account activity and security settings

#### 2. Understanding the Platform

**Key Features:**

- **File Upload**: Upload STL files for 3D printing
- **Instant Analysis**: Get print time and cost estimates
- **Maker Search**: Find local 3D printing services
- **Order Tracking**: Monitor your orders in real-time
- **Quality Assurance**: Rate and review completed orders

### File Upload and Analysis Workflow

#### Step 1: Prepare Your STL File

**File Requirements:**

- **Format**: STL, OBJ, or 3MF files
- **Size Limit**: Maximum 50MB per file
- **Quality**: Ensure your model is manifold (watertight)
- **Scale**: Verify dimensions are correct

**Pre-Upload Checklist:**

```
□ File is in supported format (.stl, .obj, .3mf)
□ File size is under 50MB
□ Model has been checked for errors
□ Dimensions are correct
□ File name is descriptive
```

#### Step 2: Upload Your File

1. **Navigate to Upload Page**

   - Click "Upload File" or "New Print Job"
   - Drag and drop your file or click "Browse"

2. **File Upload Process**

   ```
   Upload Initiated → File Validation → Secure Upload → Analysis Queue
   ```

3. **Upload Confirmation**
   - Receive upload confirmation with file ID
   - File appears in your "My Files" section
   - Analysis automatically begins

#### Step 3: Configure Print Settings

**Basic Settings:**

- **Layer Height**: 0.1mm (fine), 0.2mm (standard), 0.3mm (draft)
- **Infill Density**: 10-100% (20% recommended for most prints)
- **Material**: PLA, PETG, ABS, or specialty materials
- **Support Structures**: Auto-detect or manual selection

**Advanced Settings:**

- **Print Speed**: Adjust for quality vs. time trade-off
- **Temperature Settings**: Material-specific temperatures
- **Bed Adhesion**: Skirt, brim, or raft options
- **Post-Processing**: Sanding, painting, assembly requirements

#### Step 4: Review Analysis Results

**Analysis Report Includes:**

- **Print Time**: Estimated hours and minutes
- **Material Usage**: Filament weight in grams
- **Print Volume**: Object volume in cubic millimeters
- **Complexity Score**: 1-5 rating affecting pricing
- **Support Requirements**: Whether supports are needed
- **Potential Issues**: Warnings about problematic geometry

**Example Analysis Output:**

```
📊 Analysis Results for "phone_case.stl"
⏱️  Print Time: 3 hours 45 minutes
🎯 Material: 28.5g PLA filament
📐 Volume: 15,240 mm³
⭐ Complexity: 2.3/5 (Standard)
🏗️  Supports: Not required
⚠️  Issues: None detected
```

### Finding and Selecting Makers

#### Step 1: Search for Makers

**Search Options:**

- **Location-Based**: Find makers within specified radius
- **Material Filter**: Filter by available materials
- **Capability Filter**: Filter by printer specifications
- **Rating Filter**: Minimum rating requirements
- **Price Range**: Set budget constraints

**Search Interface:**

```
Location: [Your Address] Radius: [25 miles ▼]
Material: [PLA ▼] [PETG] [ABS] [All Materials]
Rating: [4+ stars ▼]
Price: [$0] ——————— [$100]
[Search Makers]
```

#### Step 2: Compare Makers

**Maker Profile Information:**

- **Rating**: Average customer rating (1-5 stars)
- **Reviews**: Customer feedback and photos
- **Location**: Distance from your address
- **Capabilities**: Available printers and materials
- **Pricing**: Hourly rates and material costs
- **Turnaround Time**: Typical completion time
- **Specialties**: Areas of expertise

**Comparison View:**

```
┌─────────────────┬──────────────┬──────────────┬──────────────┐
│ Maker           │ John's 3D    │ TechPrint Co │ Maker Studio │
├─────────────────┼──────────────┼──────────────┼──────────────┤
│ Rating          │ ⭐⭐⭐⭐⭐ 4.8   │ ⭐⭐⭐⭐ 4.2    │ ⭐⭐⭐⭐⭐ 4.9   │
│ Distance        │ 2.3 miles    │ 5.7 miles    │ 8.1 miles    │
│ Est. Cost       │ $24.50       │ $19.75       │ $28.00       │
│ Turnaround      │ 2-3 days     │ 1-2 days     │ 3-4 days     │
│ Materials       │ PLA, PETG    │ PLA, ABS     │ All types    │
└─────────────────┴──────────────┴──────────────┴──────────────┘
```

#### Step 3: Review Pricing

**Pricing Breakdown:**

- **Material Cost**: Based on filament weight and type
- **Labor Cost**: Maker's hourly rate × print time
- **Complexity Premium**: Additional cost for complex prints
- **Platform Fee**: Swift Prints service fee (typically 10%)
- **Shipping**: If applicable (local pickup often free)

**Example Pricing:**

```
💰 Pricing Breakdown
Material (28.5g PLA @ $0.025/g):     $0.71
Labor (3.75 hours @ $15/hour):       $56.25
Complexity Premium:                   $0.00
Platform Fee (10%):                   $5.70
Shipping:                            FREE
                                    ──────
Total:                               $62.66
```

### Placing and Managing Orders

#### Step 1: Place Your Order

**Order Configuration:**

1. **Select Maker**: Choose from search results
2. **Confirm Settings**: Review print parameters
3. **Quantity**: Specify number of copies needed
4. **Priority**: Standard or rush delivery
5. **Shipping**: Pickup or delivery options
6. **Special Instructions**: Any specific requirements

**Order Form:**

```
📋 Order Details
File: phone_case.stl
Maker: John's 3D Printing Services
Material: PLA - Galaxy Black
Quantity: [2] copies
Priority: [Standard ▼] (Rush +$10)
Delivery: [📍 Pickup] [🚚 Shipping +$5]

Special Instructions:
[Please ensure smooth finish on visible surfaces]

💳 Payment Method: [Credit Card ▼]
📍 Delivery Address: [123 Main St...]

[Place Order - $125.32]
```

#### Step 2: Order Confirmation

**Confirmation Details:**

- **Order ID**: Unique tracking number
- **Estimated Completion**: Date and time
- **Maker Contact**: Direct communication option
- **Payment Receipt**: Transaction confirmation
- **Next Steps**: What happens next

**Confirmation Email:**

```
✅ Order Confirmed - #SP240101001

Your 3D printing order has been confirmed and sent to John's 3D Printing Services.

Order Details:
• File: phone_case.stl (2 copies)
• Material: PLA - Galaxy Black
• Estimated Completion: January 5, 2024
• Total: $125.32

Track your order: https://swiftprints.com/orders/SP240101001
```

#### Step 3: Track Your Order

**Order Status Updates:**

1. **Order Placed**: Maker notified, payment processed
2. **Order Accepted**: Maker confirms and starts preparation
3. **Printing Started**: Print job begins
4. **Printing Complete**: Print finished, post-processing begins
5. **Quality Check**: Maker inspects final product
6. **Ready for Pickup/Shipping**: Order ready for delivery
7. **Completed**: Order delivered and confirmed

**Real-Time Tracking:**

```
🔄 Order Status: Printing Started
📅 Started: January 3, 2024 at 2:30 PM
⏱️  Progress: 45% complete (1h 41m remaining)
📍 Location: John's 3D Printing Services
💬 Latest Update: "Print is progressing smoothly, excellent layer adhesion"

[Message Maker] [View Photos] [Order Details]
```

#### Step 4: Receive Your Order

**Pickup Process:**

1. Receive pickup notification
2. Verify pickup location and hours
3. Bring order confirmation or ID
4. Inspect items before leaving
5. Confirm receipt in app

**Shipping Process:**

1. Receive shipping notification with tracking
2. Monitor package delivery status
3. Inspect items upon delivery
4. Report any issues within 48 hours
5. Confirm receipt in app

### Quality Assurance and Reviews

#### Inspecting Your Order

**Quality Checklist:**

```
□ All items present and accounted for
□ Correct material and color
□ Dimensions match specifications
□ Surface finish meets expectations
□ No visible defects or damage
□ Support material properly removed
□ Post-processing completed as requested
```

#### Reporting Issues

**Common Issues:**

- **Dimensional Inaccuracy**: Parts don't fit as expected
- **Surface Defects**: Layer lines, stringing, or rough finish
- **Material Issues**: Wrong color or material type
- **Incomplete Printing**: Missing features or partial prints
- **Damage**: Items damaged during printing or shipping

**Issue Resolution Process:**

1. **Document Issue**: Take photos of problems
2. **Contact Maker**: Attempt direct resolution
3. **Platform Support**: Escalate if needed
4. **Resolution Options**: Reprint, partial refund, or full refund

#### Leaving Reviews

**Review Components:**

- **Overall Rating**: 1-5 stars
- **Quality Rating**: Print quality assessment
- **Communication**: Maker responsiveness
- **Timeliness**: On-time delivery
- **Written Review**: Detailed feedback
- **Photos**: Before/after images (optional)

**Review Template:**

```
⭐⭐⭐⭐⭐ 5/5 Stars

Quality: ⭐⭐⭐⭐⭐ Excellent surface finish, perfect dimensions
Communication: ⭐⭐⭐⭐⭐ Quick responses, proactive updates
Timeliness: ⭐⭐⭐⭐ Delivered on time as promised

"John did an excellent job on my phone case. The print quality
exceeded my expectations with smooth surfaces and perfect fit.
Communication was great throughout the process with regular
updates and photos. Will definitely order again!"

[📷 Upload Photos] [Submit Review]
```

## Maker Guide

### Getting Started as a Maker

#### 1. Maker Registration

**Registration Requirements:**

- Valid email address and phone number
- Business information (if applicable)
- Physical address for customer pickup
- Bank account for payments
- Equipment and capability details

**Registration Process:**

1. **Create Account**: Sign up as a maker
2. **Verify Identity**: Provide identification documents
3. **Business Setup**: Enter business details
4. **Equipment Registration**: Add printers and capabilities
5. **Material Inventory**: List available materials
6. **Pricing Setup**: Set hourly rates and material costs
7. **Profile Creation**: Add photos and description

#### 2. Profile Optimization

**Essential Profile Elements:**

- **Professional Photos**: Workshop, equipment, sample prints
- **Detailed Description**: Experience, specialties, quality focus
- **Capability Highlights**: Unique services or materials
- **Turnaround Times**: Realistic completion estimates
- **Quality Examples**: Portfolio of best work

**Profile Example:**

```
🏭 John's 3D Printing Services
⭐ 4.8/5 stars (127 reviews) • 🏆 Verified Maker

📍 Downtown Seattle • 🚗 Pickup Available • 📦 Shipping Available

About:
Professional 3D printing services with 5+ years experience.
Specializing in functional prototypes, custom parts, and
small-batch production. Quality guaranteed with every print.

🖨️ Equipment:
• 3x Prusa i3 MK3S+ (PLA, PETG, ABS)
• 1x Ultimaker S3 (Engineering materials)
• 1x Form 3 SLA (High-detail resin prints)

🎯 Specialties:
• Functional prototypes
• Mechanical parts
• Miniatures and detailed models
• Post-processing and finishing
```

### Managing Your Maker Business

#### 1. Equipment and Inventory Management

**Printer Registration:**

```
🖨️ Add New Printer
Name: [Prusa i3 MK3S+ #1]
Model: [Prusa i3 MK3S+]
Build Volume: [250] x [210] x [210] mm
Nozzle Size: [0.4] mm
Hourly Rate: [$15.00]
Status: [🟢 Active] [🔴 Maintenance] [⚫ Offline]

Compatible Materials:
☑️ PLA    ☑️ PETG    ☑️ ABS    ☐ TPU
☐ HIPS   ☐ Wood Fill ☐ Metal Fill ☐ Carbon Fiber

[Save Printer] [Test Print] [Delete]
```

**Material Inventory:**

```
📦 Material Inventory
┌─────────────────┬──────────┬─────────┬──────────┬─────────┐
│ Material        │ Brand    │ Color   │ Stock    │ Price   │
├─────────────────┼──────────┼─────────┼──────────┼─────────┤
│ PLA             │ Hatchbox │ Black   │ 850g     │ $0.025/g│
│ PLA             │ Hatchbox │ White   │ 1200g    │ $0.025/g│
│ PETG            │ Overture │ Clear   │ 600g     │ $0.030/g│
│ ABS             │ eSUN     │ Red     │ 400g     │ $0.028/g│
└─────────────────┴──────────┴─────────┴──────────┴─────────┘

[Add Material] [Update Stock] [Adjust Pricing]
```

#### 2. Order Management Workflow

**Incoming Order Notification:**

```
🔔 New Order Received - #SP240101001

Customer: Sarah Johnson
File: phone_case.stl (2 copies)
Material: PLA - Black
Estimated Value: $62.66
Customer Notes: "Please ensure smooth finish on visible surfaces"

⏰ Auto-accept expires in: 2 hours 15 minutes

[Accept Order] [Decline] [Request Changes] [View Details]
```

**Order Acceptance Process:**

1. **Review Requirements**: Check file, material, quantity
2. **Verify Capability**: Ensure you can meet specifications
3. **Check Schedule**: Confirm availability and timeline
4. **Accept or Negotiate**: Accept as-is or propose changes
5. **Set Expectations**: Communicate timeline and process

**Order Management Dashboard:**

```
📊 Active Orders (5)
┌──────────────┬─────────────┬──────────┬─────────────┬──────────┐
│ Order ID     │ Customer    │ Status   │ Due Date    │ Value    │
├──────────────┼─────────────┼──────────┼─────────────┼──────────┤
│ SP240101001  │ Sarah J.    │ Printing │ Jan 5, 2PM  │ $62.66   │
│ SP240101002  │ Mike R.     │ Queue    │ Jan 6, 5PM  │ $45.20   │
│ SP240101003  │ Lisa K.     │ Complete │ Ready       │ $78.90   │
│ SP240101004  │ Tom B.      │ Review   │ Jan 4, 10AM │ $156.40  │
│ SP240101005  │ Amy S.      │ Prep     │ Jan 7, 3PM  │ $92.15   │
└──────────────┴─────────────┴──────────┴─────────────┴──────────┘

[View All] [Filter] [Export] [Calendar View]
```

#### 3. Production Workflow

**Pre-Print Preparation:**

1. **File Analysis**: Review STL for printability
2. **Slicing Setup**: Configure print settings
3. **Material Preparation**: Load correct filament
4. **Printer Check**: Verify bed level, nozzle clean
5. **Test Print**: Small test if needed

**Print Monitoring:**

```
🖨️ Print Status - Order #SP240101001
File: phone_case.stl (Copy 1 of 2)
Printer: Prusa i3 MK3S+ #1
Progress: ████████████░░░░ 75% (45 min remaining)
Layer: 142/189
Temperature: Nozzle 210°C, Bed 60°C
Status: 🟢 Printing normally

[Pause Print] [Cancel Print] [Adjust Settings] [Take Photo]

Customer Updates:
☑️ Print started notification sent
☑️ 50% progress update sent
☐ Completion notification (auto-send)
```

**Quality Control Process:**

1. **Visual Inspection**: Check for defects
2. **Dimensional Check**: Verify critical dimensions
3. **Surface Finish**: Assess quality level
4. **Support Removal**: Clean up support material
5. **Post-Processing**: Sanding, painting if requested
6. **Final Photos**: Document completed work

#### 4. Customer Communication

**Communication Best Practices:**

- **Proactive Updates**: Regular status updates
- **Photo Documentation**: Show progress and results
- **Issue Transparency**: Communicate problems early
- **Professional Tone**: Maintain business communication
- **Response Time**: Reply within 4 hours during business hours

**Message Templates:**

```
📱 Order Accepted
"Hi Sarah! I've accepted your order for the phone case. I'll start
printing tomorrow morning and expect to have both copies ready by
Friday afternoon. I'll send progress updates and photos. Thanks!"

📱 Print Started
"Good morning! Just started printing your phone cases. Everything
looks great so far. Estimated completion: 3.5 hours. I'll update
you at the halfway point."

📱 Issue Alert
"Hi Sarah, I noticed a small issue with the first print - there's
a minor surface imperfection on one side. I'm reprinting it now
to ensure you get perfect quality. This will add about 4 hours
to the timeline. Sorry for the delay!"

📱 Ready for Pickup
"Great news! Your phone cases are complete and look fantastic!
They're ready for pickup anytime between 9 AM - 6 PM. I'm located
at 123 Workshop Ave. Please bring your order confirmation."
```

### Quality and Customer Service

#### 1. Quality Standards

**Print Quality Checklist:**

```
□ Correct dimensions (±0.1mm tolerance)
□ Smooth surface finish (no visible layer lines on detailed areas)
□ Complete features (no missing details)
□ Proper material (correct type and color)
□ Clean support removal
□ No stringing or blobs
□ Consistent layer adhesion
□ Post-processing completed as requested
```

**Quality Grades:**

- **Premium**: Perfect finish, tight tolerances
- **Standard**: Good quality, minor imperfections acceptable
- **Draft**: Functional quality, visible layer lines OK

#### 2. Issue Resolution

**Common Print Issues:**

- **Warping**: Bed adhesion problems
- **Stringing**: Temperature or retraction issues
- **Layer Shifting**: Mechanical problems
- **Under-extrusion**: Flow rate or clog issues
- **Over-extrusion**: Flow rate too high

**Resolution Process:**

1. **Identify Root Cause**: Diagnose the problem
2. **Customer Communication**: Explain issue and solution
3. **Corrective Action**: Reprint or adjust settings
4. **Prevention**: Update processes to avoid recurrence
5. **Follow-up**: Ensure customer satisfaction

#### 3. Building Your Reputation

**Review Management:**

- **Request Reviews**: Ask satisfied customers for feedback
- **Respond to Reviews**: Thank customers and address concerns
- **Learn from Feedback**: Use reviews to improve service
- **Showcase Work**: Share photos of best prints

**Performance Metrics:**

```
📈 Your Performance (Last 30 Days)
⭐ Average Rating: 4.8/5 (↑0.1)
📦 Orders Completed: 47 (↑12)
⏱️ On-Time Delivery: 96% (↑2%)
💬 Response Time: 1.2 hours (↓0.3h)
🔄 Repeat Customers: 34% (↑8%)

🎯 Goals:
• Maintain 4.8+ star rating
• Complete 50+ orders/month
• Achieve 98% on-time delivery
• Reduce response time to <1 hour
```

### Business Growth Strategies

#### 1. Expanding Capabilities

**Equipment Upgrades:**

- **Multi-Material Printing**: MMU2S for color prints
- **Large Format**: Bigger build volumes
- **High-Speed Printing**: Faster turnaround
- **Specialty Materials**: Engineering plastics
- **Post-Processing**: Vapor smoothing, painting booth

**Service Expansion:**

- **Design Services**: CAD modeling and optimization
- **Prototyping**: Rapid iteration services
- **Small Batch Production**: Volume discounts
- **Assembly Services**: Multi-part assembly
- **Finishing Services**: Professional post-processing

#### 2. Marketing and Promotion

**Platform Optimization:**

- **SEO Keywords**: Optimize profile for search
- **Portfolio Updates**: Regular photo updates
- **Competitive Pricing**: Market rate analysis
- **Specialty Niches**: Focus on specific markets

**External Marketing:**

- **Social Media**: Instagram, Facebook showcases
- **Local Networking**: Maker spaces, trade shows
- **Business Cards**: Professional materials
- **Website**: Independent online presence

#### 3. Financial Management

**Pricing Strategy:**

```
💰 Pricing Calculator
Base Hourly Rate: $15.00
Material Markup: 15% above cost
Complexity Multipliers:
• Simple (1.0x): Basic shapes, no supports
• Standard (1.2x): Some detail, minimal supports
• Complex (1.5x): High detail, extensive supports
• Premium (2.0x): Extreme detail, specialty materials

Rush Order Premium: +50%
Volume Discounts: 5+ items = 10% off
```

**Financial Tracking:**

- **Revenue Tracking**: Monthly income goals
- **Expense Management**: Material costs, equipment
- **Profit Margins**: Target 40-60% gross margin
- **Tax Preparation**: Quarterly estimated payments

This comprehensive user guide covers all aspects of using the Swift Prints platform for both customers and makers, providing step-by-step instructions and best practices for successful 3D printing transactions.
