import search, { PUBLIC_STATES, createQueryDslQueryContainer, getElasticSearchClient } from '@/core/elasticsearch';
import LoggerApi from '@/core/logger-api';
import { AggregationsAggregationContainer, AggregationsCumulativeCardinalityAggregate } from '@elastic/elasticsearch/lib/api/types';
import { JurisprudenciaVersion } from '@stjiris/jurisprudencia-document';
import type { NextApiRequest, NextApiResponse } from 'next'

export default LoggerApi(async function getLastReport(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    let mostRecentResult = await search(createQueryDslQueryContainer(), undefined, 0, { MostRecent: { max: { field: "Data" } } }, 0, {}, true);
    let mostRecentAgg = mostRecentResult.aggregations?.MostRecent as AggregationsCumulativeCardinalityAggregate;
    return res.json({
      version: JurisprudenciaVersion,
      mostRecent: mostRecentAgg?.value_as_string || new Date().toISOString().split("T")[0],
      publicStates: PUBLIC_STATES,
    });
  } catch (e) {
    return res.json({
      version: JurisprudenciaVersion,
      mostRecent: new Date().toISOString().split("T")[0],
      publicStates: PUBLIC_STATES,
    });
  }
});
