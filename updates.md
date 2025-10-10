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

### Desktop Print Studio - COMPLETED! 🎉
Route: `/studio`

**Features Implemented:**
- **Left Panel (40%)**:
  - Drag-and-drop STL upload with visual feedback
  - Material selector grid (PLA, PETG, ABS, TPU, Carbon Fiber, Wood Fill)
  - Color picker showing available inventory from all makers
  - Advanced options (collapsible): Layer height, infill %, infill pattern, supports, bed adhesion, vase mode
  - Tabbed interface: "Browse Makers" vs "Post for Bids"
  - Maker cards with ratings, location, verification badges

- **Right Panel (60%)**:
  - Full-height STL 3D viewer (reusing Balu's existing STLViewer component)
  - Empty state with helpful messaging

- **Design System**:
  - Absurd Industries colors (beige/orange accent)
  - Jura font family
  - Font Awesome icons
  - Smooth transitions and hover effects
  - Sticky headers with backdrop blur

**Phase 3: Mobile Experience**
- [ ] Upload screen (entry point)
- [ ] Material overlay (slide-up sheet)
- [ ] Color picker overlay
- [ ] Advanced options accordion
- [ ] Maker list overlay
- [ ] Quote/checkout overlay with QR code

**Phase 4: Maker Dashboard**
- [ ] Inventory management UI
- [ ] Add/edit printers
- [ ] Toggle colors in-stock/out-of-stock
- [ ] View incoming bid requests

**Phase 5: Bidding Flow**
- [ ] Post print request for bids
- [ ] View bids from makers
- [ ] Accept bid → checkout with QR code

---

## Notes
- Keep it CRISP AF
- Mobile overlays should feel native/app-like
- Desktop split view should be clean and functional
- Use Absurd design system religiously (colors, spacing, animations)
