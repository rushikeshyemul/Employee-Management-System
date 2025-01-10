import { createContext, useEffect } from "react";
import { useState } from "react";
import { getLocalStorage, setLocalStorage } from "../utils/localStorage";

export const AuthContext = createContext();
// WE HAVE CREATED A CONTEXT WE CAN USE IT ANYWHERE

const AuthProvider = ({ children }) => {
  //
  const [userData, setUserData] = useState("");

  useEffect(() => {
    setLocalStorage();
    const { employees } = getLocalStorage(); // OBJECT IS CREATED
    setUserData(employees);
  }, []);

  return (
    <div>
      <AuthContext.Provider value={[userData, setUserData]}>
        {children}
      </AuthContext.Provider>
    </div>
  );
};

export default AuthProvider;
