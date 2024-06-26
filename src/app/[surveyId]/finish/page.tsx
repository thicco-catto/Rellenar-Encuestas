import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Survey } from "../../../models/Survey";
import { GetVariable, StorageVariable } from "../../../utils/localStorage";
import SurveyTitle from "../../../components/surveyTitle";
import LoadingScreen from "../../../components/loadingScreen";
import { SurveyNode } from "../../../models/SurveyNode";

function FinishSurvey() {
    const params = useParams();
    const surveyId = params.surveyId!;

    const [survey, setSurvey] = useState<Survey | undefined>();
    const [surveyNode, setSurveyNode] = useState<SurveyNode | undefined>();

    useEffect(() => {
        const existingSurvey = GetVariable<Survey>(StorageVariable.SURVEY_INFO);
        const existingNode = GetVariable<SurveyNode>(StorageVariable.CURRENT_NODE);

        if (existingSurvey && existingSurvey.ID === surveyId && existingNode) {
            setSurvey(existingSurvey);
            setSurveyNode(existingNode);
        } else {
            window.location.href = `/${surveyId}/start`;
        }
    }, [surveyId]);

    return <>
        {
            survey ?
                <>
                    <SurveyTitle title={survey.Title}></SurveyTitle>
                    <main>
                        {
                            surveyNode ?
                                <div className="finish-div">
                                    <h1 className="mb-3">Ha terminado la encuesta</h1>

                                    <h2 className="mb-0">Su resultado es:</h2>
                                    {
                                        //We have to do toString and parseInt because json.parse doesn't correctly
                                        //parse numbers from json.stringify
                                        parseInt(surveyNode.Result.toString()) === 0?
                                        <h2>No dependiente</h2>
                                        :
                                        <h2>Dependiente</h2>
                                    }
                                </div>
                                :
                                <LoadingScreen title="Cargando resultados..."></LoadingScreen>
                        }
                    </main>
                </>
                :
                <main>
                    <LoadingScreen></LoadingScreen>
                </main>
        }
    </>;
}

export default FinishSurvey;