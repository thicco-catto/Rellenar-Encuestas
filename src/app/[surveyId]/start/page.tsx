import { useParams } from "react-router-dom";
import { GetSurvey } from "../../../repositories/surveyRepo";
import { useCallback, useEffect, useState } from "react";
import { Button, Spinner } from "react-bootstrap";
import { Survey } from "../../../models/Survey";
import { GetVariable, SetVariable, StorageVariable } from "../../../utils/localStorage";
import SurveyTitle from "../../../components/surveyTitle";

function StartSurvey() {
    const params = useParams();
    const surveyId = params.surveyId!;

    const [survey, setSurvey] = useState<Survey|undefined>();

    const FetchSurveyData = useCallback(async function () {
        const fetchedSurvey = await GetSurvey(surveyId);
        if(fetchedSurvey) {
            SetVariable(StorageVariable.SURVEY_INFO, fetchedSurvey);
            SetVariable(StorageVariable.QUESTION_ORDER, fetchedSurvey.QuestionOrder);

            setSurvey(fetchedSurvey);
        }
    }, [surveyId])

    useEffect(() => {
        const existingSurvey = GetVariable<Survey>(StorageVariable.SURVEY_INFO);

        if(existingSurvey && existingSurvey.ID === surveyId) {
            setSurvey(existingSurvey);
        } else {
            FetchSurveyData();
        }
    }, [surveyId, FetchSurveyData]);

    function OnContinueButtonClick() {
        window.location.href = `/${surveyId}/selectProfile`;
    }

    return <>
        {
            survey?
            <>
            <SurveyTitle title={survey.Title}></SurveyTitle>
            <main>
                <p className="survey-description">{survey.PublicDescription}</p>

                <Button onClick={OnContinueButtonClick} variant="secondary">Comenzar Encuesta</Button>
            </main>
            </>
            :
            <Spinner></Spinner>
        }
    </>;
}

export default StartSurvey;