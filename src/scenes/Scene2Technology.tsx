import React from "react";
import { AbsoluteFill } from "remotion";
import { Shot } from "../components/Transitions";
import { UF, UF_DURATION } from "./technology/UF";
import { RO, RO_DURATION } from "./technology/RO";
import { Desal, DESAL_DURATION } from "./technology/Desal";
import { Reclamation, RECLAMATION_DURATION } from "./technology/Reclamation";
import { colors } from "../theme";

const X = 10; // overlap between shots (frames)
const RO_FROM = UF_DURATION - X;
const DESAL_FROM = RO_FROM + RO_DURATION - X;
const RECLAMATION_FROM = DESAL_FROM + DESAL_DURATION - X;

// UF → RO → desalination → reclamation, each shot travelling into the next.
export const Scene2Technology: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: colors.deepNavy }}>
    <Shot from={0} duration={UF_DURATION} overlapOut={X} name="UF">
      <UF />
    </Shot>
    <Shot from={RO_FROM} duration={RO_DURATION} overlapIn={X} overlapOut={X} name="RO">
      <RO />
    </Shot>
    <Shot from={DESAL_FROM} duration={DESAL_DURATION} overlapIn={X} overlapOut={X} name="Desalination">
      <Desal />
    </Shot>
    <Shot from={RECLAMATION_FROM} duration={RECLAMATION_DURATION} overlapIn={X} name="Water reclamation">
      <Reclamation />
    </Shot>
  </AbsoluteFill>
);
