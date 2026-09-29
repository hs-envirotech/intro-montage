import React from "react";
import { AbsoluteFill } from "remotion";
import { Shot } from "../components/Transitions";
import { PrpcUf, PRPC_DURATION } from "./projects/PrpcUf";
import { Emas, EMAS_DURATION } from "./projects/Emas";
import { colors } from "../theme";

const X = 10;

// Grounded and credible: verified project experience only (see PROJECTS in config.ts).
export const Scene5Projects: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: colors.deepNavy }}>
    <Shot from={0} duration={PRPC_DURATION} overlapOut={X} name="PRPC UF">
      <PrpcUf />
    </Shot>
    <Shot from={PRPC_DURATION - X} duration={EMAS_DURATION} overlapIn={X} name="EMAS Project">
      <Emas />
    </Shot>
  </AbsoluteFill>
);
