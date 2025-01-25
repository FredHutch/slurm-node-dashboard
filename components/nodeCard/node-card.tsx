import { useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import NodeCardModal from "@/components/modals/card-job-modal";
import { getStatusDef } from "@/utils/nodes";
import CardHover from "./card-hover";
import GPUUsageDisplay from "./gpu-progress";
import { parseGPUResources } from "@/utils/gpu-parse";
import { GPUUsageData, NodeCardProps } from "@/types/types";

const calculateTotalGPUUsage = (
  gres: string,
  gresUsed: string
): GPUUsageData => {
  return parseGPUResources(gres, gresUsed);
};

const SmallCardContent: React.FC<{ name: string }> = ({ name }) => (
  <div className={`flex m-auto items-center justify-center w-full h-full`}>
    <div className="font-extrabold text-[10px] mb-.5">{name}</div>
  </div>
);

const MediumCardContent = ({
  name,
  coresUsed,
  coresTotal,
  memoryUsed,
  memoryTotal,
  nodeData,
}: NodeCardProps) => {
  const { gpuUsed, gpuTotal } = calculateTotalGPUUsage(
    nodeData.gres,
    nodeData.gres_used
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-1">
        <div className="font-extrabold text-[10px] mb-.5">{name}</div>
        <p className=" text-[9px]">
          CPU: {coresUsed} / {coresTotal}
        </p>
        <p className="text-[9px]">
          MEM: {(memoryUsed / 1024).toFixed(0)} /{" "}
          {(memoryTotal / 1024).toFixed(0)}
        </p>
      </div>
      {gpuTotal > 0 && (
        <div className="mt-auto mb-1">
          <GPUUsageDisplay gpuUsed={gpuUsed} gpuTotal={gpuTotal} />
        </div>
      )}
    </div>
  );
};

const LargeCardContent = ({
  name,
  coresUsed,
  coresTotal,
  memoryUsed,
  memoryTotal,
  nodeData,
}: NodeCardProps) => {
  const { gpuUsed, gpuTotal } = calculateTotalGPUUsage(
    nodeData.gres,
    nodeData.gres_used
  );

  return (
    <div className="flex flex-col h-full p-1">
      <div className="flex-grow">
        <div className="font-extrabold text-[10px] mb-.5 truncate max-w-[140px]">
          {name}
        </div>
        <p className="text-[9px]">
          CPU: {coresUsed} / {coresTotal}
        </p>
        <p className="text-[9px]">
          MEM: {(memoryUsed / 1024).toFixed(0)} /{" "}
          {(memoryTotal / 1024).toFixed(0)}
        </p>
        <p className="text-[9px]">
          Load: {(nodeData.cpu_load / coresTotal).toFixed(2)}
        </p>
      </div>
      {gpuTotal > 0 && (
        <div className="mt-auto">
          <GPUUsageDisplay gpuUsed={gpuUsed} gpuTotal={gpuTotal} />
        </div>
      )}
    </div>
  );
};

const getStatusColor = (
  status: string,
  colorSchema: string = "default"
): { bgColor: string; textColor: string } => {
  const statusLevel = status[1] || status[0];
  const colorMap: {
    [key: string]: { [key: string]: { bgColor: string; textColor: string } };
  } = {
    default: {
      DRAIN: { bgColor: "bg-blue-400", textColor: "text-white" },
      NOT_RESPONDING: { bgColor: "bg-blue-400", textColor: "text-white" },
      DOWN: { bgColor: "bg-blue-400", textColor: "text-white" },
      IDLE: { bgColor: "bg-green-700", textColor: "text-white" },
      MIXED: { bgColor: "bg-orange-800", textColor: "text-white" },
      PLANNED: { bgColor: "bg-indigo-500", textColor: "text-white" },
      ALLOCATED: { bgColor: "bg-red-900", textColor: "text-white" },
      COMPLETING: { bgColor: "bg-yellow-500", textColor: "text-white" },
      RESERVED: { bgColor: "bg-indigo-800", textColor: "text-white" },
      FUTURE: { bgColor: "bg-emerald-500", textColor: "text-white" },
      REBOOT_REQUESTED: { bgColor: "bg-stone-500", textColor: "text-white" },
    },
    semantic: {
      DOWN: { bgColor: "bg-red-700", textColor: "text-white" },
      NOT_RESPONDING: { bgColor: "bg-red-600", textColor: "text-white" },
      DRAIN: { bgColor: "bg-amber-600", textColor: "text-white" },
      MIXED: { bgColor: "bg-orange-600", textColor: "text-white" },
      COMPLETING: { bgColor: "bg-yellow-600", textColor: "text-white" },
      ALLOCATED: { bgColor: "bg-blue-700", textColor: "text-white" },
      RESERVED: { bgColor: "bg-blue-600", textColor: "text-white" },
      IDLE: { bgColor: "bg-emerald-600", textColor: "text-white" },
      PLANNED: { bgColor: "bg-purple-600", textColor: "text-white" },
      FUTURE: { bgColor: "bg-violet-600", textColor: "text-white" },
      REBOOT_REQUESTED: { bgColor: "bg-slate-600", textColor: "text-white" },
    },
    modern: {
      DOWN: { bgColor: "bg-rose-700", textColor: "text-white" },
      NOT_RESPONDING: { bgColor: "bg-rose-600", textColor: "text-white" },
      DRAIN: { bgColor: "bg-yellow-600", textColor: "text-white" },
      MIXED: { bgColor: "bg-orange-700", textColor: "text-white" },
      COMPLETING: { bgColor: "bg-amber-600", textColor: "text-white" },
      ALLOCATED: { bgColor: "bg-sky-700", textColor: "text-white" },
      RESERVED: { bgColor: "bg-sky-600", textColor: "text-white" },
      IDLE: { bgColor: "bg-teal-600", textColor: "text-white" },
      PLANNED: { bgColor: "bg-indigo-600", textColor: "text-white" },
      FUTURE: { bgColor: "bg-violet-600", textColor: "text-white" },
      REBOOT_REQUESTED: { bgColor: "bg-zinc-600", textColor: "text-white" },
    },
    contrast: {
      DOWN: { bgColor: "bg-red-900", textColor: "text-white" },
      NOT_RESPONDING: { bgColor: "bg-red-800", textColor: "text-white" },
      DRAIN: { bgColor: "bg-amber-800", textColor: "text-white" },
      MIXED: { bgColor: "bg-orange-900", textColor: "text-white" },
      COMPLETING: { bgColor: "bg-yellow-800", textColor: "text-white" },
      ALLOCATED: { bgColor: "bg-blue-900", textColor: "text-white" },
      RESERVED: { bgColor: "bg-blue-800", textColor: "text-white" },
      IDLE: { bgColor: "bg-emerald-800", textColor: "text-white" },
      PLANNED: { bgColor: "bg-purple-800", textColor: "text-white" },
      FUTURE: { bgColor: "bg-violet-800", textColor: "text-white" },
      REBOOT_REQUESTED: { bgColor: "bg-slate-800", textColor: "text-white" },
    },
    soft: {
      DOWN: { bgColor: "bg-red-500", textColor: "text-white" },
      NOT_RESPONDING: { bgColor: "bg-red-400", textColor: "text-white" },
      DRAIN: { bgColor: "bg-amber-500", textColor: "text-white" },
      MIXED: { bgColor: "bg-orange-500", textColor: "text-white" },
      COMPLETING: { bgColor: "bg-yellow-500", textColor: "text-white" },
      ALLOCATED: { bgColor: "bg-blue-500", textColor: "text-white" },
      RESERVED: { bgColor: "bg-blue-400", textColor: "text-white" },
      IDLE: { bgColor: "bg-emerald-500", textColor: "text-white" },
      PLANNED: { bgColor: "bg-purple-500", textColor: "text-white" },
      FUTURE: { bgColor: "bg-violet-500", textColor: "text-white" },
      REBOOT_REQUESTED: { bgColor: "bg-slate-500", textColor: "text-white" },
    },
  };

  return (
    colorMap[colorSchema]?.[statusLevel] ||
    colorMap.default[statusLevel] || {
      bgColor: "bg-gray-900",
      textColor: "text-white",
    }
  );
};

export const NodeCard = ({
  colorSchema = "default",
  ...props
}: NodeCardProps & { colorSchema?: string }) => {
  const [open, setOpen] = useState(false);
  const { bgColor, textColor } = getStatusColor(props.status, colorSchema);
  const statusDef = getStatusDef(props.status);
  const cpuLoad = parseFloat(
    (props.nodeData.cpu_load / props.coresTotal).toFixed(2)
  );

  const openModal = () => setOpen(!open);

  const cardContent = () => {
    switch (props.size) {
      case 50:
        return <SmallCardContent name={props.name} />;
      case 100:
        return <MediumCardContent {...props} />;
      case 150:
        return <LargeCardContent {...props} />;
      default:
        return <MediumCardContent {...props} />;
    }
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div
          className={`border-[1px] cursor-pointer m-0.5 p-1 rounded-[5px] shadow-xl ${bgColor} ${textColor} ${
            props.size === 50
              ? "w-[80px] h-[25px]"
              : props.size === 100
              ? "w-[80px] h-[85px]"
              : props.size === 150
              ? "w-[80px] h-[100px]"
              : "w-[80px] h-[70px]"
          } ${cpuLoad > 125 ? "animate-pulse border-black" : ""}`}
          onClick={props.historical ? undefined : openModal}
        >
          <div className="items-center justify-center h-full w-full">
            <div className="h-full w-full">{cardContent()}</div>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-96 m-5 font-extralight text-sm">
        <CardHover
          nodeData={props.nodeData}
          cpuLoad={cpuLoad}
          statusDef={statusDef}
        />
      </HoverCardContent>
      <NodeCardModal open={open} setOpen={setOpen} nodename={props.name} />
    </HoverCard>
  );
};

export default NodeCard;
