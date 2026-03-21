import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { actions } from "../utils/actions";
import { speak } from "../utils/speak";

export const useVoice = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const SpeechRecognition =
       (window as any).SpeechRecognition ||
       (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.log("Voice not supported");
        return;
    }

    const recognition = new SpeechRecognition(); // ✅ FIXED
    recognition.continuous = true;
    recognition.lang = "en-US";

    const act = actions(navigate);

    recognition.onresult = (event: any) => {
      const command =
        event.results[event.results.length - 1][0].transcript
          .toLowerCase()
          .trim();

      console.log("Command:", command);

      if (command.includes("dashboard")) act.goDashboard();
      else if (command.includes("settings")) act.goSettings();
      else if (command.includes("history")) act.goHistory();
      else if (command.includes("ocr")) act.goOCR();
      else if (command.includes("speech")) act.goSpeech();
      else if (command.includes("sign")) act.goSign();
      else if (command.includes("sos")) act.goSOS();
      else if (command.includes("logout")) act.logout();
      else speak("Command not recognized");
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [navigate]);
};