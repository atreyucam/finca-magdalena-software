import { BrowserRouter } from "react-router-dom";
import AppRouter from "./routes/AppRouter";
import ToastContainer from "./components/ToastContainer";

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <AppRouter />
    </BrowserRouter>
  );
}
