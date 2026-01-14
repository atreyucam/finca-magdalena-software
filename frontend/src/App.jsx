import { BrowserRouter } from "react-router-dom";
import AppRouter from "./routes/AppRouter";
import ToastContainer from "./components/ToastContainer";
import AppTitle from "./components/app/AppTitle";

export default function App() {
  return (
    <BrowserRouter>
      <AppTitle />
      <ToastContainer />
      <AppRouter />
    </BrowserRouter>
  );
}
