import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import Landing from "./pages/Landing";
import DesignGallery from "./pages/DesignGallery";
import BoxBuilderPage from "./pages/BoxBuilderPage";
import KeychainPage from "./pages/KeychainPage";
import UploadPage from "./pages/UploadPage";
import MaterialsPage from "./pages/MaterialsPage";
import OrdersPage from "./pages/OrdersPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/design" element={<DesignGallery />} />
          <Route path="/design/box-builder" element={<BoxBuilderPage />} />
          <Route path="/design/keychain" element={<KeychainPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
