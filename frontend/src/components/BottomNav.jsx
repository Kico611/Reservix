import React from "react";
import { NavLink } from "react-router-dom";
import { FaHome, FaCalendarAlt, FaCog, FaUser } from "react-icons/fa";
import "../styles/BottomNav.css"; // možeš kopirati stilove iz App.css

const BottomNav = () => {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
        <FaHome className="icon" />
        <span className="label">Početna</span>
      </NavLink>
      <NavLink
        to="/raspored"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        <FaCalendarAlt className="icon" />
        <span className="label">Raspored</span>
      </NavLink>
      <NavLink
        to="/postavke"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        <FaCog className="icon" />
        <span className="label">Postavke</span>
      </NavLink>
      <NavLink
        to="/profil"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        <FaUser className="icon" />
        <span className="label">Profil</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
