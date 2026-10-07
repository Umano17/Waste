import { Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import Study from "@/pages/Study";
import Prototype from "@/pages/Prototype";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <Routes>
        <Route path="/" element={<Study />} />
        <Route path="/prototipo" element={<Prototype />} />
        <Route path="*" element={<Study />} />
      </Routes>
      <Toaster richColors />
    </div>
  );
}
