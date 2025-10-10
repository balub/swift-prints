# Swift Prints - Development Updates

## 2025-10-11 - Project Kickoff & Architecture Planning

### Vision
Building a **peer-to-peer 3D printing marketplace** where makers with printers become the infrastructure. Users upload models, select materials/colors from makers' real-time inventory, and either browse available makers or post jobs for bidding. Swift Prints acts as an aggregator - all transactions happen directly with makers (QR code payment at checkout).

### Core Requirements

#### Desktop Experience
- **Left Panel**: Upload, material selection, maker browsing, controls
- **Right Panel**: Live STL preview/render of uploaded model

#### Mobile Experience
- Upload-first flow
- App-like overlay/sheet system for progressive selection
- Flow: Model Upload → Material → Color → Maker → Get Quote/Bid

#### Design System
- Using **Absurd Industries Design System** (Jura font, beige/dark theme, orange accent #ff4500)
- Font Awesome for icons
- React + Tailwind CSS (matching design system vars)
- Mobile-first with smooth overlay animations

#### User Flow Philosophy
- **Minimum friction**: Let users explore without forcing authentication
- **Progressive enhancement**: Basic users get simple flow, advanced users get detailed controls
- **Real-time inventory**: Makers' materials/colors update live (in-stock vs. out-of-stock)

#### Maker Features
- Each maker registers their printer(s) with capabilities
- Materials: PLA, PETG, TPU, etc.
- Colors: Real inventory tracking (available/out-of-stock)
- Makers can: receive bid requests + be browsable/searchable

#### Payment & Transaction
- **No escrow** (for now)
- Display maker's QR code at checkout
- Direct maker-to-customer payment

#### Technical Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Backend: FastAPI (Python)
- File handling: STL upload, preview, basic file storage
- Database: TBD (likely PostgreSQL or SQLite for MVP)

---

## Architecture Decisions (FINALIZED)

### Approach: Mock Frontend-Only Flow
**Decision**: Build complete end-to-end UX with **mock JSON data files**. No backend implementation - Balu will replace JSON mocks with real API endpoints later.

### Data Strategy
- All data stored in JSON files in `/apps/frontend/src/data/`
- Mock files: `makers.json`, `materials.json`, `colors.json`, `printRequests.json`, `bids.json`
- Frontend simulates API calls with timeouts/delays for realistic UX

### Reusable Components from Existing Codebase
✅ **Keep & Enhance:**
- STLViewer component (Three.js + react-three-fiber) - works perfectly
- File upload with drag-drop - smooth UX
- shadcn/ui component library - restyle with Absurd design system
- Basic cost calculation logic - extend with advanced options

### Print Options (Advanced Users)
- **Layer Height**: 0.1mm - 0.3mm (dropdown)
- **Infill %**: 10% - 100% (slider)
- **Infill Type**: Grid, Honeycomb, Gyroid, Triangular (dropdown)
- **Supports**: Yes/No toggle
- **Bed Adhesion**: Brim, Raft, Skirt, None (dropdown)
- **Vase Mode**: Yes/No toggle

### Pricing Auto-Calculation
```
Material Cost = filament_g × maker.price_per_gram
Labor Cost = print_time_hours × maker.hourly_rate
Complexity Premium = (supports ? 5 : 0) + (infill > 50% ? 3 : 0)
Total = Material + Labor + Premium
```

### Mock Data Schema

#### makers.json
```json
{
  "id": "maker-1",
  "name": "TechPrint Solutions",
  "email": "contact@techprint.com",
  "phone": "+1-555-0123",
  "location": "Downtown, 2.3 miles",
  "bio": "Professional 3D printing since 2018",
  "rating": 4.8,
  "totalPrints": 127,
  "qrCodeUrl": "/qr/maker-1.png",
  "printers": [
    {
      "id": "printer-1",
      "name": "Prusa i3 MK3S+",
      "brand": "Prusa",
      "maxVolume": {"x": 250, "y": 210, "z": 210},
      "hourlyRate": 15,
      "materials": [
        {
          "type": "PLA",
          "pricePerGram": 0.025,
          "colors": [
            {"name": "Black", "hex": "#000000", "quantityGrams": 500, "inStock": true},
            {"name": "White", "hex": "#FFFFFF", "quantityGrams": 0, "inStock": false}
          ]
        }
      ],
      "capabilities": {
        "layerHeights": [0.1, 0.15, 0.2, 0.25, 0.3],
        "infillTypes": ["grid", "honeycomb", "gyroid"],
        "supportsVaseMode": true
      }
    }
  ]
}
```

### Implementation Plan

**Phase 1: Setup & Theme** ✅
- [x] Audit existing codebase
- [ ] Create mock JSON data files
- [ ] Apply Absurd design system (colors, fonts, CSS vars)

**Phase 2: Desktop Experience** ✅
- [x] Split-panel layout (left: controls, right: STL viewer)
- [x] Material/color selectors with real-time inventory
- [x] Advanced print options (collapsible for beginners)
- [x] Maker browser with filtering

### Print Studio - COMPLETED! 🎉🔥
Route: `/studio`

**Desktop & Mobile Fully Implemented!**

#### Core Features (Both Desktop & Mobile):

**1. File Upload**
- Drag-and-drop STL file upload with visual feedback
- Download demo STL file option (demo-cube.stl in public/)
- File validation and size display

**2. Vase Mode Toggle** (appears FIRST to prevent data loss)
- Single-wall hollow print option
- Auto-disables conflicting advanced options when enabled
- Clear tooltips explaining functionality

**3. Material & Color Selection**
- Combined material+color grid (unified selection)
- Shows ALL available combinations from maker inventory
- Displays "from ₹X.XX/g" showing lowest available price
- Indicates number of makers who have each combo in stock
- Real-time filtering by in-stock status

**4. Maker Selection** ✨ NEW!
- Smart recommendation system (highest rated + verified makers shown first)
- "Recommended" badge on top choice
- Detailed maker cards showing:
  - Name with verification badge
  - Star rating and total successful prints
  - Location
  - Exact pricing: ₹X.XX/g and ₹X/hr
- Click to select any maker
- Desktop: Expandable cards list
- Mobile: Slide-up sheet with scrollable maker list

**5. Advanced Print Options** (collapsible, hidden if vase mode active)
- Layer Height: 0.1mm - 0.3mm dropdown
- Infill Density: 10% - 100% slider
- Infill Pattern: Grid, Honeycomb, Gyroid, Triangular
- Generate Supports: Yes/No toggle
- Bed Adhesion: None, Skirt, Brim, Raft
- Native HTML tooltips on all settings for grandmother-friendly UX

**6. Live Cost Estimation**
- Real-time calculation based on:
  - Material cost (filament grams × price per gram)
  - Labor cost (print time hours × hourly rate)
  - Complexity premium (supports + high infill)
- Detailed breakdown showing all cost components
- Maker details card with:
  - Maker name, verification, rating, location
  - Total successful prints
  - Exact rates used in calculation
- Total price prominently displayed

**7. Checkout**
- "Proceed to Checkout" button (ready for QR code implementation)

#### Desktop Layout (lg: breakpoint and up):
- **No top navbar** (full immersive experience)
- **Split-panel layout**: 40% controls (left) / 60% 3D viewer (right)
- **Left Panel**:
  - Sticky header with branding
  - Scrollable controls area
  - Sequential flow: Upload → Vase Mode → Material+Color → Maker Selection → Advanced Options → Cost Estimate
- **Right Panel**:
  - Full-height STL 3D viewer with Three.js
  - Empty state with helpful messaging

#### Mobile Layout (< lg breakpoint):
- **No top navbar** (full screen app-like experience)
- **Sticky header** with compact branding
- **Progressive disclosure via slide-up sheets**:
  - Material & Color Sheet: Full grid of all combinations
  - Maker Selection Sheet: Scrollable list with recommendations
  - Advanced Settings Sheet: All print options with descriptions
- **Inline elements**:
  - Upload card
  - 3D preview card (embedded, 256px height)
  - Vase mode toggle
  - Cost estimate with maker details

#### Design System Applied:
- **Colors**: Absurd Industries beige (#ece0cf) background, orange (#ff4500) accent
- **Typography**: Jura font family throughout
- **Icons**: Font Awesome kit
- **Animations**: Smooth transitions, hover effects, scale on selection
- **Components**: shadcn/ui (Button, Card, Badge, Select, Slider, Switch, Sheet, Label)
- **Accessibility**: Native tooltips, semantic HTML, keyboard navigation support

#### Technical Implementation:
- Mock JSON data (makers.json, materials.json) - ready for API replacement
- Smart data structures: Material+color combos grouped with all available makers
- Recommendation algorithm: Sorts by verified status → rating → total prints
- Auto-reset maker selection when material+color changes
- Vase mode logic: useEffect clears conflicting options
- Responsive: Mobile-first with lg: breakpoint for desktop

**Phase 3: Mobile Experience** ✅
- [x] Upload screen (entry point)
- [x] Material overlay (slide-up sheet)
- [x] Color picker overlay (combined with material)
- [x] Maker selection overlay with recommendations
- [x] Advanced options accordion (slide-up sheet)
- [x] Cost estimate with maker details

---

## Next Steps (Future Implementation)

**Phase 4: Maker Dashboard**
- [ ] Inventory management UI
- [ ] Add/edit printers
- [ ] Toggle colors in-stock/out-of-stock
- [ ] View incoming bid requests

**Phase 5: Bidding Flow**
- [ ] Post print request for bids
- [ ] View bids from makers
- [ ] Accept bid → checkout with QR code

**Phase 6: Checkout & Payment**
- [ ] QR code generation for direct maker payment
- [ ] Order confirmation screen
- [ ] Order tracking

---

## Development Notes
- **Design Philosophy**: Keep it CRISP AF ✨
- **Mobile UX**: Overlays feel native/app-like with smooth animations
- **Desktop UX**: Clean split-view, distraction-free immersive experience
- **Code Quality**: Ready for API integration - just swap JSON imports with fetch calls
- **Accessibility**: Grandmother-friendly with tooltips everywhere
- **Performance**: Native tooltips > Radix tooltips (no nested button issues!)

**File Structure:**
```
apps/frontend/
├── src/
│   ├── pages/PrintStudio.tsx (1100+ lines - COMPLETE desktop + mobile)
│   ├── components/
│   │   ├── Navbar.tsx (hides on /studio route)
│   │   └── STLViewer.tsx (Three.js renderer)
│   └── data/
│       ├── makers.json (4 makers with full details)
│       └── materials.json (6 material types)
└── public/
    └── demo-cube.stl (ASCII STL format, 1mm cube)
```

**Design System Compliance:**
- ✅ Jura font throughout
- ✅ #ece0cf beige background
- ✅ #ff4500 orange accent/primary
- ✅ Font Awesome icons
- ✅ Smooth transitions and animations
- ✅ Mobile-first responsive
