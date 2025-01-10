import React, { useState } from "react";
import { setLocalStorage } from "../../utils/localStorage";

export const Header = (props) => {
  // console.log(data);
  // const [username, setUsername] = useState("");

  // if (!data) {
  //   setUsername("Admin");
  // } else {
  //   setUsername(data.firstName);
  // }
  // const firstName = user?.firstName;

  const logOutUser = () => {
    localStorage.setItem("loggedInUser", "");
    // window.location.reload();
    props.changeUser("");
  };

  return (
    <div id="Header" className="flex items-end justify-between">
      <h1 className="text-2xl font-medium">
        Hello <br />
        <span className="text-3xl font-semibold">username</span>
      </h1>
      <button
        onClick={logOutUser}
        className="bg-red-600 text-lg font-medium text-white px-5 py-2 rounded-md"
      >
        Log Out
      </button>
    </div>
  );
};
