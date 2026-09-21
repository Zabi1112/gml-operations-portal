import { createContext, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import { resolveBranchSelection } from "./branchSelection.js";

export const BranchContext = createContext();

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchError, setBranchError] = useState("");

  const selectBranch = useCallback((branch) => {
    setSelectedBranch(branch);
    if (branch) {
      localStorage.setItem("selectedBranch", JSON.stringify(branch));
      localStorage.setItem("branchId", branch.id);
    } else {
      localStorage.removeItem("selectedBranch");
      localStorage.removeItem("branchId");
    }
  }, []);

  const refreshBranches = useCallback((signal) => {
    const token = localStorage.getItem("token");
    if (!token) return Promise.resolve();
    return axios.get(API + "/branches", {
      headers: { Authorization: "Bearer " + token }, signal
    }).then(({ data }) => {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem("selectedBranch")); } catch { /* Fall back to current work. */ }
      setBranches(data);
      selectBranch(resolveBranchSelection(data, saved));
      setBranchError("");
    }).catch(error => {
      if (!axios.isCancel(error)) setBranchError("Unable to load branches. Check your connection and refresh the page.");
    });
  }, [selectBranch]);

  useEffect(() => {
    const controller = new AbortController();
    refreshBranches(controller.signal);
    return () => controller.abort();
  }, [refreshBranches]);

  return (
    <BranchContext.Provider value={{ branches, selectedBranch, selectBranch, refreshBranches, branchError }}>
      {children}
    </BranchContext.Provider>
  );
}
