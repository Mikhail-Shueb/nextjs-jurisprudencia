import { GetServerSideProps } from "next";
import { LoggerServerSideProps } from "@/core/logger-api";

export const getServerSideProps: GetServerSideProps = LoggerServerSideProps(async (ctx) => {
  const queryStr = new URLSearchParams(ctx.query as Record<string, string>).toString();
  const destination = queryStr ? `/dashboard?${queryStr}` : "/dashboard";

  return {
    redirect: {
      destination,
      permanent: false
    }
  };
});

export default function Estatistica() {
  return null;
}