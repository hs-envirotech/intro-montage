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
    <Shot from={0} duration={EMAS_DURATION} overlapOut={X} name="EMAS Project (MRCSB)">
      <Emas />
    </Shot>
    <Shot from={EMAS_DURATION - X} duration={PRPC_DURATION} overlapIn={X} name="PRPC UF">
      <PrpcUf />
    </Shot>
  </AbsoluteFill>
);
