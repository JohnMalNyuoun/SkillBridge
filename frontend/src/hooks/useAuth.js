import { useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";

const useAuth = () => {
  return useContext(AuthContext);
};

export default useAuth;
