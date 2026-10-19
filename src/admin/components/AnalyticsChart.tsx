type Metric={metric_date:string;metric_name:string;metric_value:number|null};
const count=(value:number)=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:1}).format(value);
const dateLabel=(key:string)=>new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${key}T00:00:00Z`));

export default function AnalyticsChart({metrics,range,endDay}:{metrics:Metric[];range:number;endDay:string}){
  const end=new Date(`${endDay}T00:00:00Z`);
  const totals=new Map<string,number>();
  for(const item of metrics){
    const day=item.metric_date.slice(0,10);
    const value=Number(item.metric_value);
    if(Number.isFinite(value))totals.set(day,(totals.get(day)??0)+value);
  }
  const points=Array.from({length:range},(_,index)=>{
    const date=new Date(end);date.setUTCDate(date.getUTCDate()-(range-1-index));
    const key=date.toISOString().slice(0,10);
    return {key,value:totals.get(key)??0};
  });
  const maximum=Math.max(1,...points.map(item=>item.value));
  const ceiling=Math.max(2,Math.ceil(maximum/2)*2);
  const width=Math.max(680,range*14+52);
  const left=52;const right=20;const top=20;const height=180;const bottom=top+height;
  const stride=(width-left-right)/range;
  const barWidth=Math.max(4,Math.min(24,stride-3));
  const labelStep=Math.max(1,Math.ceil(range/6));
  return <div className="cms-analytics-chart">
    <div className="cms-analytics-chart-scroll" role="region" aria-label="Grafik aktivitas harian, dapat digulir" tabIndex={0}>
      <svg style={{minWidth:width}} viewBox={`0 0 ${width} 250`} role="img" aria-label={`Jumlah interaksi per hari selama ${range} hari, dari ${dateLabel(points[0].key)} sampai ${dateLabel(endDay)}`}>
        {[0,0.5,1].map(fraction=>{const y=bottom-fraction*height;return <g key={fraction}><line x1={left} x2={width-right} y1={y} y2={y} className="cms-analytics-grid-line"/><text x={left-10} y={y+4} textAnchor="end" className="cms-analytics-axis-text">{count(ceiling*fraction)}</text></g>;})}
        {points.map((point,index)=>{const x=left+index*stride+(stride-barWidth)/2;const barHeight=point.value/ceiling*height;return <g key={point.key}><rect x={x} y={bottom-barHeight} width={barWidth} height={barHeight} rx="3" className="cms-analytics-bar"><title>{dateLabel(point.key)}: {count(point.value)} interaksi</title></rect>{(index%labelStep===0||index===points.length-1)&&<text x={left+(index+0.5)*stride} y={232} textAnchor="middle" className="cms-analytics-axis-text">{dateLabel(point.key)}</text>}</g>;})}
      </svg>
    </div>
    <details className="cms-analytics-data"><summary>Lihat data harian</summary><div className="cms-table-wrap"><table><thead><tr><th scope="col">Tanggal</th><th scope="col">Interaksi</th></tr></thead><tbody>{points.map(point=><tr key={point.key}><td>{dateLabel(point.key)}</td><td>{count(point.value)}</td></tr>)}</tbody></table></div></details>
  </div>;
}
