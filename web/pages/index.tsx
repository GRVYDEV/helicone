import {
  ArrowDownIcon,
  ArrowUpIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import { SupabaseClient } from "@supabase/supabase-js";
import Head from "next/head";
import { useEffect, useState } from "react";

import { supabaseClient } from "../lib/supabaseClient";
import { Request as ValyrRequest } from "../schema/request";
import { ValyrResponse } from "../schema/resoponse";
import { DateMetrics } from "./timeGraph";

export default function Home() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  useEffect(() => {
    supabaseClient("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").then(
      (client) => {
        setClient(client);
      }
    );
  }, []);

  return (
    <div className="flex flex-col">
      <Head>
        <title>Valyr better logging for OpenAI</title>
        <meta name="description" content="Valyr" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="items-center pt-5 pb-12 md:h-screen ">
        {client !== null ? (
          <LoggedInFlow setClient={setClient} client={client} />
        ) : (
          <>
            <h1 className="text-6xl text-center my-8">Welcome to Valyr 🛡</h1>
            {OnBoarding(setClient)}
          </>
        )}
      </main>

      <footer className="fixed left-0 bottom-0 z-20 h-12 w-full text-center border-t-2 border-slate-800 bg-black bg-opacity-90">
        <a target="_blank" rel="noopener noreferrer">
          Footer things go here
        </a>
      </footer>
    </div>
  );
}
function LoggedInFlow({
  setClient,
  client,
}: {
  setClient: (client: SupabaseClient | null) => void;
  client: SupabaseClient;
}) {
  return (
    <div className="flex flex-col h-full px-10 pb-12">
      <div className="h-1/6 ">{ResetAPIKey(setClient)}</div>
      <div className="h-2/6 w-full ">
        <div className="flex flex-col md:flex-row gap-8 ">
          <div className="flex-1 border-[1px] border-slate-700 rounded-lg px-5 py-3 flex flex-col items-center">
            <MetricsPanel client={client} />
          </div>
          <div className="flex-1 border-[1px] text-xs border-slate-700 rounded-lg px-5 py-3 max-h-60 overflow-y-auto ">
            {/* This is a vertically scrollable table */}
            <div className="flex flex-row justify-between">
              <div className="flex flex-row gap-2">
                <InformationCircleIcon className="h-5 w-5 text-slate-300" />
                <p className="text-slate-300">Logs</p>
              </div>
              <div className="flex flex-row gap-2">
                <p className="text-slate-300 animate-pulse">Live</p>
                <ArrowUpIcon className="h-5 w-5 text-slate-300" />
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <Logs client={client} />
            </div>
          </div>
        </div>
      </div>
      <div className="h-3/6 w-full ">
        <GraphAndCharts client={client} />
      </div>
    </div>
  );
}
interface Log {
  event: "request" | "response";
  id: string;
  created_at: Date;
  body: string;
}
function Logs({ client }: { client: SupabaseClient }) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    console.log("Fetching logs");
    const channel = client.channel("db-messages");
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "request" },
      (payload) => {
        const request: ValyrRequest = payload.new as unknown as ValyrRequest;
        setLogs((logs) =>
          logs.concat([
            {
              event: "request",
              id: request.id,
              created_at: new Date(request.created_at),
              body: JSON.stringify(request.body),
            },
          ])
        );
      }
    );
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "response" },
      (payload) => {
        const response: ValyrResponse = payload.new as unknown as ValyrResponse;
        setLogs((logs) =>
          logs.concat([
            {
              event: "response",
              id: response.id,
              created_at: new Date(response.created_at),
              body: JSON.stringify(response.body),
            },
          ])
        );
      }
    );
    channel.subscribe(async (status) => {
      console.log("STATUS", status);
    });
  }, [client]);

  return (
    <div>
      {logs.reverse().map((log) => (
        <LogCard log={log} key={log.id} />
      ))}
    </div>
  );
}

function LogCard({ log: l, key }: { log: Log; key: string }): JSX.Element {
  return (
    <div
      key={key}
      className="flex flex-row justify-between items-center border-[1px] border-slate-700 rounded-lg px-5 py-3"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2">
          <p className="text-slate-300">{l.event}</p>
          <p className="text-slate-300">{l.created_at.toLocaleString()}</p>
        </div>
        <div className="flex flex-row gap-2">
          <p className="text-slate-300">{middleTruncString(l.body, 50)}</p>
        </div>
      </div>
      <DocumentDuplicateIcon
        className="h-5 w-5 text-slate-300 hover:cursor-pointer"
        onClick={() => {
          navigator.clipboard.writeText(l.body);
        }}
      />
    </div>
  );
}

function GraphAndCharts({ client }: { client: SupabaseClient }) {
  const [showRequestTable, setShowRequestTable] = useState(false);
  return (
    <>
      <div className="h-[10%] w-full pl-10 flex flex-col gap-3 mt-4">
        <div className="flex flex-row gap-5 items-center">
          <div className="bg-slate-800 rounded-full flex flex-row gap-2">
            <div
              className={
                "flex flex-row gap-2 items-center px-10 rounded-full py-1 cursor-pointer " +
                (showRequestTable || "bg-slate-600")
              }
              onClick={() => setShowRequestTable(false)}
            >
              <p
                className={
                  showRequestTable ? "text-slate-100" : "text-slate-200"
                }
              >
                Graph
              </p>
            </div>
            <div
              className={
                "flex flex-row gap-2 items-center px-10 rounded-full py-1 cursor-pointer " +
                (showRequestTable && "bg-slate-600")
              }
              onClick={() => setShowRequestTable(true)}
            >
              <p
                className={
                  showRequestTable ? "text-slate-200" : "text-slate-100"
                }
              >
                Table
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full h-[90%] py-5">
        {showRequestTable ? (
          <RequestTable client={client} />
        ) : (
          <TimeGraphWHeader client={client} />
        )}
      </div>
    </>
  );
}

interface RequestTableRow {
  time: string;
  request: string;
  response: string;
  duration: string;
  tokenCount: number;
}

interface ResponseAndRequest {
  response_body: any;
  response_id: string;
  response_created_at: string;
  request_id: string;
  request_body: any;
  request_path: string;
  request_created_at: string;
}

function truncString(str: string, n: number) {
  return str.length > n ? str.substring(0, n - 1) + "..." : str;
}

function middleTruncString(str: string, n: number) {
  return str.length > n
    ? str.substring(0, n / 2) +
        "..." +
        str.substring(str.length - n / 2, str.length)
    : str;
}

function RequestTable({ client }: { client: SupabaseClient }) {
  const [data, setData] = useState<ResponseAndRequest[]>([]);
  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await client
        .from("response_and_request")
        .select("*")
        .order("request_created_at", { ascending: false })
        .limit(1000);
      if (error) {
        console.log(error);
      } else {
        setData(data);
      }
    };
    fetch();
  }, [client]);
  console.log(data[0]);
  return (
    <div className="h-full">
      <div>
        <span>Showing the most recent {} </span>
        <span className="font-thin text-xs">(max 1000)</span>
      </div>
      <div className="h-full overflow-y-auto mt-3">
        <table className="w-full mt-5 table-auto ">
          <thead>
            <tr className="text-slate-300">
              <th className="text-left">Time</th>
              <th className="text-left">Request</th>
              <th className="text-left">Response</th>
              <th className="text-left">Duration</th>
              <th className="text-left">Token Count</th>
              <th className="text-left">Copy</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr className="text-slate-300" key={row.request_id}>
                <td>{new Date(row.request_created_at).toLocaleString()}</td>
                <td>{truncString(row.request_body.prompt, 15)}</td>
                <td>{truncString(row.response_body.choices[0].text, 15)}</td>
                <td>
                  {(
                    (new Date(row.response_created_at).getTime() -
                      new Date(row.request_created_at).getTime()) /
                    1000
                  ).toString()}{" "}
                  s
                </td>
                <td>{row.response_body.usage.total_tokens}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimeGraphWHeader({ client }: { client: SupabaseClient }) {
  return (
    <div className="h-full w-full">
      <div className="w-full h-1/6 pl-10">
        <p className="text-lg text-slate-300">Number of requests over time</p>
      </div>
      <div className="w-full h-5/6">
        <DateMetrics client={client} />
      </div>
    </div>
  );
}

function MetricsPanel({ client }: { client: SupabaseClient }) {
  interface Metrics {
    request_today: number;
    avg_requests_per_day: number;
    avg_response_time: number;
    avg_token_per_request: number;
    avg_cost_per_request: number;
    total_requests: number;
  }

  const [data, setData] = useState<Metrics | null>(null);
  const metrics = [
    {
      value: data?.request_today ?? "n/a",
      label: "Requests today",
    },
    {
      value: data?.avg_requests_per_day ?? "n/a",
      label: "Average requests per day",
    },
    {
      value: data?.avg_response_time ?? "n/a",
      label: "Average response time",
    },
    {
      value: data?.avg_token_per_request ?? "n/a",
      label: "Average # of Token/request",
    },
    {
      value: data?.avg_cost_per_request ?? "n/a",
      label: "Average cost/request",
    },
    {
      value: data?.total_requests ?? "n/a",
      label: "Total requests",
    },
  ];
  useEffect(() => {
    const fetch = async () => {
      const { count: totalRequests, error: totalRequestError } = await client
        .from("response")
        .select("*", { count: "exact", head: true });

      if (totalRequestError !== null) {
        console.log(totalRequestError);
      } else {
        console.log("JKF", totalRequests);
        setData({
          request_today: undefined!, //TODO
          avg_requests_per_day: undefined!,
          avg_response_time: undefined!,
          avg_token_per_request: undefined!,
          avg_cost_per_request: undefined!,
          total_requests: totalRequests!,
        });
      }
    };
    fetch();
  }, [client]);

  return (
    <div className="grid grid-cols-5 gap-2">
      {metrics.map((m) => (
        <>
          <div className="col-span-3">{m.label}</div>
          <div className="text-indigo-400 font-bold text-right col-span-2">
            {m.value}
          </div>
        </>
      ))}
    </div>
  );
}

function ResetAPIKey(setClient) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row justify-center items-center gap-4">
        <InformationCircleIcon className="h-6 w-6 text-slate-300" />
        <p className="text-slate-300">
          You are currently viewing API Key {"Kkfd...kjdf"}
        </p>
      </div>
      <div className="flex flex-row justify-center items-center gap-4">
        <button
          className="px-4 py-2 rounded-full text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-slate-100"
          onClick={() => {
            setClient(null);
          }}
        >
          Reset API key
        </button>
      </div>
    </div>
  );
}

function OnBoarding(setClient) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="border-[1px] border-slate-700 rounded-lg px-5 py-3 flex flex-col items-center">
        <h3 className="text-xl mb-5">Replace your OpenAI url</h3>
        <code className="bg-slate-800 p-1 text-md">api.openai.com/v1</code>
        <ArrowDownIcon className="h-4" />
        <code className="bg-slate-800 p-1 text-md">oai.valyrai.com/v1</code>
      </div>
      <div className="border-[1px] border-slate-700 rounded-lg px-5 py-3 flex flex-col items-center justify-between">
        <h3 className="text-xl mb-5">Paste your OpenAI API key</h3>
        <div className="flex flex-col items-end">
          <input
            className="bg-slate-800 p-1"
            type="password"
            placeholder="Your OpenAI API key"
            onChange={(e) => {
              supabaseClient(e.target.value).then((client) => {
                setClient(client);
              });
            }}
          />
          <button className="text-sm text-slate-300">demo</button>
        </div>
        <i className="text-sm text-slate-300 flex flex-row items-center">
          your key is never stored on our servers
          <InformationCircleIcon className="h-5 mx-1" />
        </i>
      </div>
    </div>
  );
}
