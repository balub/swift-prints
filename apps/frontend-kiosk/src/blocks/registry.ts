import type { DesignBlock } from "./types";

/**
 * Registry of laser-cut design blocks shown in the /design gallery.
 * To add a new block: add an entry here, create a generator under
 * src/blocks/<slug>/ and a page under src/pages/, then register the route.
 */
export const DESIGN_BLOCKS: DesignBlock[] = [
  {
    id: "box-builder",
    name: "Laser-Cut Box",
    slug: "box-builder",
    category: "makers",
    description: "Finger-joint box from your dimensions — open or closed top.",
    status: "available",
  },
  {
    id: "keychain",
    name: "Keychain / Text Tag",
    slug: "keychain",
    category: "gifts",
    description: "Personalized tag with engraved text and a keyring hole.",
    status: "available",
  },
  {
    id: "enclosure",
    name: "Electronics Enclosure",
    slug: "enclosure",
    category: "makers",
    description: "Project box with port cutouts and ventilation slots.",
    status: "available",
  },
  {
    id: "front-panel",
    name: "Front Panel",
    slug: "front-panel",
    category: "engineering",
    description: "Instrument panel with labeled holes for switches and jacks.",
    status: "available",
  },
  {
    // slug intentionally distinct from the 3D-print route /design/pcb-standoff
    id: "mounting-plate",
    name: "Mounting Plate",
    slug: "mounting-plate",
    category: "engineering",
    description: "Flat plate with holes at exact positions for PCBs and gear.",
    status: "available",
  },
  {
    id: "phone-stand",
    name: "Phone Stand",
    slug: "phone-stand",
    category: "home",
    description: "Slot-together desk stand for your phone or tablet.",
    status: "available",
  },
  {
    id: "qr-sign",
    name: "QR Code Sign",
    slug: "qr-sign",
    category: "business",
    description: "Scannable QR sign for menus, payments and links.",
    status: "available",
  },
  {
    id: "coaster-set",
    name: "Coaster Set",
    slug: "coaster-set",
    category: "gifts",
    description: "Matching coasters with engraved patterns or initials.",
    status: "available",
  },
  {
    id: "drawer-divider",
    name: "Drawer Divider",
    slug: "drawer-divider",
    category: "home",
    description: "Custom grid organizer sized to your drawer.",
    status: "available",
  },
  {
    id: "display-stand",
    name: "Display Stand",
    slug: "display-stand",
    category: "business",
    description: "Angled riser for products, cards or retail shelves.",
    status: "available",
  },
  {
    id: "name-sign",
    name: "Name Sign",
    slug: "name-sign",
    category: "gifts",
    description: "Cut-out name in a friendly script for walls and doors.",
    status: "available",
  },
  {
    id: "edge-lit-sign",
    name: "Edge-Lit Acrylic Sign",
    slug: "edge-lit-sign",
    category: "business",
    description: "Engraved acrylic panel that glows on an LED base.",
    status: "available",
  },
];

export const CATEGORY_LABELS: Record<DesignBlock["category"], string> = {
  makers: "Makers",
  home: "Home",
  gifts: "Gifts",
  business: "Business",
  engineering: "Engineering",
};
