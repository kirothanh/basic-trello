import { useState } from "react";
// import Trello from "./Trello";
import KanbanBoard from "./KanbanBoard";

export default function Login() {
  const SERVER_API = "https://api-exercise-trello.vercel.app/api/v1";
  const [isLoading, setIsLoading] = useState(false);
  const [checkApiKey, setCheckApiKey] = useState(
    localStorage.getItem("apikey")
  );

  const handleGetApiKey = async (email) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${SERVER_API}/api-key?email=${email}`);
      if (!response.ok) {
        console.log("Error when fetching API key");
      }
      const data = await response.json();
      setIsLoading(false);
      return data;
    } catch (error) {
      console.log("Error occurred when getting API key: ", error);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const emailInfo = formData.get("email");
    const { data } = await handleGetApiKey(emailInfo);
    if (data && data.apiKey) {
      localStorage.setItem("apikey", data.apiKey);
      setCheckApiKey(data.apiKey);
    }
  };

  return (
    <>
      {checkApiKey ? (
        <KanbanBoard SERVER_API={SERVER_API} apiKey={checkApiKey} />
      ) : (
        <div className="flex fixed inset-0 items-center justify-center flex-col bg-teal-400">
          {isLoading ? (
            <h1 className="font-medium text-lg py-4">Loading...</h1>
          ) : (
            <h1 className="font-medium text-lg py-4">Enter the Email!</h1>
          )}
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              className="bg-teal-300 border-teal-950 p-4 w-full"
              autoCorrect="email"
            />
          </form>
        </div>
      )}
    </>
  );
}
