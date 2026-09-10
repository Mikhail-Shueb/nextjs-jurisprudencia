import { long, SearchTotalHits, AggregationsMinAggregate, AggregationsMaxAggregate } from "@elastic/elasticsearch/lib/api/types";
import { GetServerSideProps, GetServerSidePropsContext, PreviewData } from "next";
import search, { createQueryDslQueryContainer, DEFAULT_AGGS, populateFilters, SearchFilters } from "@/core/elasticsearch"
import { ParsedUrlQuery } from "querystring";
import { authenticatedHandler } from "@/core/user/authenticate";

import { filterMockDecisions, MOCK_DECISIONS } from "@/core/mock-jurisprudencia";

export interface FormProps {
    count: number,
    filtersUsed: Record<string, string[]>,
    isOffline?: boolean,
}

export function withForm<
    Props extends FormProps,
    Params extends ParsedUrlQuery = ParsedUrlQuery,
    Preview extends PreviewData = PreviewData>(sub: (ctx: GetServerSidePropsContext, formProps: FormProps) => Promise<Props>): GetServerSideProps<Props, Params, Preview>{

    return async (ctx) => {
        const sfilters = {pre: [], after: []};
        const filtersUsed = populateFilters(sfilters, ctx.query)
        const queryObj = createQueryDslQueryContainer(ctx.query.q);
        
        let total = 124580;
        let minAno = 1968;
        let maxAno = 2026;
        let isOffline = false;

        try {
            const authed = await authenticatedHandler(ctx.req);
            const result = await search(queryObj, sfilters, 0, DEFAULT_AGGS, 0, {track_scores: true, _source: []}, authed);
            if (result.hits.total) {
                if (Number.isInteger(result.hits.total)) {
                    total = result.hits.total as long;
                } else {
                    total = (result.hits.total as SearchTotalHits).value;
                }
            }
            const parsedMin = parseInt((result.aggregations?.MinAno as AggregationsMinAggregate)?.value_as_string || "");
            if (Number.isFinite(parsedMin) && parsedMin > 0) minAno = parsedMin;

            const parsedMax = parseInt((result.aggregations?.MaxAno as AggregationsMaxAggregate)?.value_as_string || "");
            if (Number.isFinite(parsedMax) && parsedMax > 0 && parsedMax !== Infinity) maxAno = parsedMax;
        } catch (error) {
            console.warn("withForm: Elasticsearch offline, using fallback parameters:", error);
            isOffline = true;
            const queryStr = Array.isArray(ctx.query.q) ? ctx.query.q.join(" ") : ctx.query.q || "";
            const minDate = Array.isArray(ctx.query.MinDate) ? ctx.query.MinDate[0] : ctx.query.MinDate;
            const maxDate = Array.isArray(ctx.query.MaxDate) ? ctx.query.MaxDate[0] : ctx.query.MaxDate;
            const area = (Array.isArray(ctx.query["Área.Index.keyword"]) ? ctx.query["Área.Index.keyword"][0] : ctx.query["Área.Index.keyword"] || ctx.query.area) as string | undefined;

            const matches = filterMockDecisions(queryStr, area, minDate, maxDate);
            total = matches.length;
        }
        let formProps: FormProps = {
            count: Number.isFinite(total) ? total : 0,
            filtersUsed: filtersUsed,
            isOffline
        };
        return {props: await sub(ctx, formProps)}
    }
}
