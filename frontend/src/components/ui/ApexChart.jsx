// frontend/src/components/ui/ApexChart.jsx
import React from "react";
import ReactApexChart from "react-apexcharts";

export default function ApexChart({
  type = "line",
  series = [],
  options = {},
  height = 280,
  className = "",
}) {
  return (
    <div className={className}>
      <ReactApexChart type={type} series={series} options={options} height={height} />
    </div>
  );
}
