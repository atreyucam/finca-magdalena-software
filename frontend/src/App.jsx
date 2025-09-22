import { BrowserRouter } from "react-router-dom";
import AppRouter from "./routes/AppRouter";
import { Toaster } from "react-hot-toast"; // 👈

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster position="top-right" reverseOrder={false} />
    </BrowserRouter>
  );
}
