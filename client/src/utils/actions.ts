import { NavigateFunction } from "react-router-dom";

export const actions = (navigate: NavigateFunction) => ({
  goHome: () => navigate("/"),
  goLogin: () => navigate("/login"),
  goRegister: () => navigate("/register"),
  goDashboard: () => navigate("/dashboard"),
  goHistory: () => navigate("/history"),
  goSettings: () => navigate("/settings"),
  goOCR: () => navigate("/ocr"),
  goSpeech: () => navigate("/speech-to-text"),
  goSign: () => navigate("/sign-language"),
  goSOS: () => navigate("/sos"),

  logout: () => {
    localStorage.clear();
    navigate("/login");
  }
});