import AdminPage from "./components/pages/AdminPage";

const API_BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

function App() {
  return <AdminPage apiBaseUrl={API_BASE_URL} />;
}

export default App;
