import InsightPlot from '@/_components/insight-plot';
import * as Modal from '@/_components/modal';
import PageModalHeader from '@/_components/page-modal-header';
import Number from '@/_constants/enum-number';
import getInsight from '@/_queries/get-insight';
import getPublicInsight from '@/_queries/get-public-insight';
import getPublicSubject from '@/_queries/get-public-subject';
import getSubject from '@/_queries/get-subject';
import listEvents from '@/_queries/list-events';
import listPublicEvents from '@/_queries/list-public-events';
import { InsightConfigJson } from '@/_types/insight-config-json';
import formatEventFilters from '@/_utilities/format-event-filters';

interface InsightPageProps {
  from?: string;
  insightId: string;
  isPublic?: boolean;
  subjectId: string;
  to?: string;
}

const InsightPage = async ({
  from,
  insightId,
  isPublic,
  subjectId,
  to,
}: InsightPageProps) => {
  const f = formatEventFilters({
    from,
    limit: String(Number.FourByteSignedIntMax - 1),
    to,
  });

  const [{ data: subject }, { data: events }, { data: insight }] =
    await Promise.all([
      isPublic ? getPublicSubject(subjectId) : getSubject(subjectId),
      isPublic ? listPublicEvents(subjectId, f) : listEvents(subjectId, f),
      isPublic ? getPublicInsight(insightId) : getInsight(insightId),
    ]);

  if (!subject || !events || !insight) return null;
  const config = insight.config as InsightConfigJson;

  return (
    <Modal.Content className="max-w-5xl bg-bg-3">
      <PageModalHeader className="-mb-8" title={insight.name} />
      <InsightPlot
        annotationIncludeEventsFrom={config.annotationIncludeEventsFrom}
        annotationInputId={config.annotationInput}
        annotationInputOptions={config.annotationInputOptions}
        events={events}
        includeEventsFrom={config.includeEventsFrom}
        includeEventsSince={config.includeEventsSince}
        inputId={config.input}
        inputOptions={config.inputOptions}
        interval={config.interval}
        isPublic={isPublic}
        lineCurveFunction={config.lineCurveFunction}
        marginBottom={config.marginBottom}
        marginLeft={config.marginLeft}
        marginRight={config.marginRight}
        marginTop={config.marginTop}
        reducer={config.reducer}
        showLinearRegression={config.showLinearRegression}
        showLinearRegressionConfidence={config.showLinearRegressionConfidence}
        subjectId={subjectId}
        title={insight.name}
        type={config.type}
      />
    </Modal.Content>
  );
};

export default InsightPage;
