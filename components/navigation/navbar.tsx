"use client";

import AnimationContainer from "../global/animation-container";
import ResponsiveNavbar from "./responsive-navbar";

const Navbar = () => {
  return (
    <>
      <AnimationContainer reverse delay={0.1}>
        <ResponsiveNavbar />
      </AnimationContainer>
    </>
  );
};

export default Navbar;