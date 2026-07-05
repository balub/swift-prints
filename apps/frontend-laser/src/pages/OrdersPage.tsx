import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PackageOpen } from "lucide-react";

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto text-center py-24">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <PackageOpen className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold font-jura mb-2">No orders yet</h1>
        <p className="text-text-muted mb-6 max-w-md mx-auto">
          Ordering and quoting are coming soon. For now, design something and download the laser-ready file.
        </p>
        <Button asChild>
          <Link to="/design">Browse design blocks</Link>
        </Button>
      </div>
    </div>
  );
}
