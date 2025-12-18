import React, { useContext, useEffect, useState } from "react";
import Login from "./components/Auth/Login";
import EmployeeDashboard from "./components/Dashboard/EmployeeDashboard";
import { Header } from "./components/others/Header";
import AdminDashboard from "./components/Dashboard/AdminDashboard";
import { getLocalStorage, setLocalStorage } from "./utils/localStorage";
import { AuthContext } from "./context/AuthProvider";

const App = () => {
  const [user, setUser] = useState(null);
  const [loggedInUserData, setLoggedInUserData] = useState("");
  const [userData, setUserData] = useContext(AuthContext); // USING CONTEXT HERE

  useEffect(() => {
    const loggedInUser = localStorage.getItem("loggedInUser");

    if (loggedInUser) {
      const userData = JSON.parse(loggedInUser);
      setUser(userData.role);
      setLoggedInUserData(userData.data);
    }
  }, []);

  const handleLogin = (email, password) => {
    if (email === "admin@gmail.com" && password === "123") {
      // SET ADMIN
      setUser("admin");
      localStorage.setItem("loggedInUser", JSON.stringify({ role: "admin" }));
    } else if (userData) {
      const employee = userData.find(
        (e) => email === e.email && password === e.password
        // FINDING EMPLOYEE DATA FROM THE DATASET
      );
      if (employee) {
        // SET EMPLOYEE
        setUser("employee");
        setLoggedInUserData(employee);
        localStorage.setItem(
          "loggedInUser",
          JSON.stringify({ role: "employee", data: employee })
        );
      }
    } else {
      alert("Invalid Credentials");
    }
  };

  useEffect(() => {
    setLocalStorage(); // SETTING THE DATA TO LOCAL STORAGE
    getLocalStorage(); // GETTING THE DATA FROM LOCAL STORAGE
  }, []); // Dependancy Array Prevents Unnecessary Rerenders

  return (
    <>
      {!user && <Login handleLogin={handleLogin} />}
      {user === "admin" ? (
        <AdminDashboard changeUser={setUser} />
      ) : user == "employee" ? (
        <EmployeeDashboard data={loggedInUserData} changeUser={setUser} />
      ) : null}
    </>
  );
};

export default App; // Default Exported

// {!user && <Login />} is a shorthand for an if-else statement: if user is empty, Login renders.
// The sections below check if the user role is admin or employee and render the respective dashboard.
