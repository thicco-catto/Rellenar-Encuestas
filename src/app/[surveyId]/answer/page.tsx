import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { Survey } from "../../../models/Survey";
import { useParams } from "react-router-dom";
import { SurveyQuestion } from "../../../models/SurveyQuestion";
import { GetVariable, SetVariable, StorageVariable } from "../../../utils/localStorage";
import { Button, Col, Container, Form, Modal, Row } from "react-bootstrap";
import { QuestionType } from "../../../models/Question";
import { QuestionDetails } from "../../../models/QuestionDetails";
import SurveyTitle from "../../../components/surveyTitle";
import { GetQuestion } from "../../../repositories/questionRepo";
import { GetAllVersions } from "../../../repositories/versionRepo";
import LoadingScreen from "../../../components/loadingScreen";
import { SurveyNode } from "../../../models/SurveyNode";
import { GetNextNode, GetRootNode } from "../../../repositories/surveyNodeRepo";
import { QuestionCircle } from "react-bootstrap-icons";

function AnswerSurvey() {
    const params = useParams();
    const surveyId = params.surveyId!;

    const [survey, setSurvey] = useState<Survey | undefined>();
    const [questionOrder, setQuestionOrder] = useState<string[] | undefined>();
    const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[] | undefined>();
    const [currQuestionIdx, setCurrQuestionIdx] = useState(0);
    const [surveyNode, _setSurveyNode] = useState<SurveyNode | undefined>();
    const [traversedSurveyNodes, setTraversedSurveyNodes] = useState<SurveyNode[]>([]);
    const [, setAnswer] = useState("");
    const [answerIndex, setAnswerIndex] = useState(0);

    const [helpModalShow, setHelpModalShow] = useState(false);

    const handleHelpModalClose = () => setHelpModalShow(false);
    const handleHelpModalShow = () => setHelpModalShow(true);

    const FinishSurvey = useCallback(function() {
        window.location.href = `/${surveyId}/finish`;
    }, [surveyId]);

    const SetSurveyNode = useCallback(function(node: SurveyNode | undefined) {
        SetVariable(StorageVariable.CURRENT_NODE, node);

        if(!node?.QuestionId) {
            FinishSurvey();
            return;
        }

        _setSurveyNode(node);
    }, [FinishSurvey]);

    const GetFirstSurveyNode = useCallback(async function() {
        const root = await GetRootNode(surveyId);

        return root;
    }, [surveyId]);

    const LoadQuestions = useCallback(async function (selectedProfile: string, existingQuestionOrder: string[]) {
        const loadedQuestions: SurveyQuestion[] = [];

        for (let i = 0; i < existingQuestionOrder.length; i++) {
            const questionId = existingQuestionOrder[i];

            const question = await GetQuestion(surveyId, questionId);

            if (question) {
                let questionDetails: QuestionDetails | undefined = undefined;

                if (question.HasVersions && selectedProfile !== "NoProfile") {
                    const versions = await GetAllVersions(surveyId, questionId);

                    if (versions) {
                        let hasAdded = false;

                        for (let o = 0; o < versions.length; o++) {
                            const version = versions[o];
                            if (version.Profiles.includes(selectedProfile)) {
                                hasAdded = true;
                                questionDetails = version.Details;
                                break;
                            }
                        }

                        if (!hasAdded) {
                            questionDetails = question.DefaultDetails;
                        }
                    }
                } else {
                    questionDetails = question.DefaultDetails;
                }

                loadedQuestions.push({
                    ID: question.ID!,
                    QuestionType: question.QuestionType,
                    Details: questionDetails!,
                    Help: question.Help
                });

                setSurveyQuestions([...loadedQuestions]);
            }
        }
    }, [surveyId]);

    useEffect(() => {
        const existingSurvey = GetVariable<Survey>(StorageVariable.SURVEY_INFO);
        const existingQuestionOrder = GetVariable<string[]>(StorageVariable.QUESTION_ORDER);
        const selectedProfile = GetVariable<string>(StorageVariable.SELECTED_PROFILE);
        const traversedNodes = GetVariable<SurveyNode[]>(StorageVariable.TRAVERSED_NODES);

        if (existingSurvey && existingSurvey.ID === surveyId && existingQuestionOrder && selectedProfile) {
            setSurvey(existingSurvey);
            setQuestionOrder(existingQuestionOrder);

            setTraversedSurveyNodes(traversedNodes ?? []);

            LoadQuestions(selectedProfile, existingQuestionOrder);

            const existingNode = GetVariable<SurveyNode>(StorageVariable.CURRENT_NODE);

            if(!existingNode) {
                GetFirstSurveyNode().then(node => {
                    SetSurveyNode(node);
                });
            } else {
                SetSurveyNode(existingNode);
            }
        } else {
            window.location.href = `/${surveyId}/start`
        }
    }, [surveyId, LoadQuestions, GetFirstSurveyNode, SetSurveyNode]);

    function ChangeAnswer(e: ChangeEvent<HTMLInputElement>) {
        const target = e.target;
        const value = target.value;

        if(target.type === "radio" || target.type === "check") {
            const tokens = value.split("-");

            setAnswerIndex(parseInt(tokens[0]));

            tokens.splice(0, 1);
            setAnswer(tokens.join("-"));
        } else {
            setAnswerIndex(0);
            setAnswer(value);
        }
    }

    function GetQuestionBody(type: QuestionType, details: QuestionDetails) {
        if (type === QuestionType.SINGLE_CHOICE) {
            return <>
                {
                    details.Answers.map((answer, i) =>
                        <>
                            <Form.Check onChange={ChangeAnswer} required key={`${currQuestionIdx}-${i}`} type="radio" name="answers" value={`${i}-${answer}`} label={answer}></Form.Check>
                        </>
                    )
                }
            </>;
        } else if (type === QuestionType.MULTIPLE_CHOICE) {
            return <>
                {
                    details.Answers.map((answer, i) =>
                        <>
                            <Form.Check onChange={ChangeAnswer} key={`${currQuestionIdx}-${i}`} type="checkbox" name="answers" value={`${i}-${answer}`} label={answer}></Form.Check>
                        </>
                    )
                }
            </>;
        } else if (type === QuestionType.FREE_TEXT) {
            return <Form.Control onChange={ChangeAnswer} key={`${currQuestionIdx}`} type="text" required placeholder="Introduzca su respuesta"></Form.Control>;
        } else if (type === QuestionType.DATE) {
            return <Form.Control onChange={ChangeAnswer} key={`${currQuestionIdx}`} required type="date"></Form.Control>
        } else if (type === QuestionType.RANGE) {
            return <Container className="m-0 p-0 numeric-range-container">
                <Row className="m-0 p-0">
                    <Col className="m-0 p-0 text-center col-3">
                        {details.First}
                    </Col>

                    <Col className="m-0 p-0 col-6">
                        <Row className="m-0 p-0">
                            {
                                details.Answers.map((_, i) =>
                                    <Col className="m-0 p-0 text-center">
                                        <Form.Label key={`${currQuestionIdx}-${i}`} htmlFor={`${currQuestionIdx}-${i}`}>{i + 1}</Form.Label>
                                    </Col>
                                )
                            }
                        </Row>

                        <Row className="m-0 p-0">
                            {
                                details.Answers.map((answer, i) =>
                                    <Col className="m-0 p-0 text-center">
                                        <Form.Check onChange={ChangeAnswer} required key={`${currQuestionIdx}-${i}`} id={`${currQuestionIdx}-${i}`} type="radio" name="answers" value={`${i}-${answer}`}></Form.Check>
                                    </Col>
                                )
                            }
                        </Row>
                    </Col>

                    <Col className="m-0 p-0 text-center col-3">
                        {details.Last}
                    </Col>
                </Row>
            </Container>
        }

        return <p>Tipo de pregunta no soportada {type}</p>
    }

    async function NextQuestion(hasSkipped = false) {
        if(!surveyNode) { return; }
        
        let answer = answerIndex.toString();
        if(hasSkipped) {
            answer = "skip";
        }
        const newNode = await GetNextNode(surveyId, surveyNode.ID, answer);
        const newTraversedNodes = [...traversedSurveyNodes, surveyNode];

        setTraversedSurveyNodes(newTraversedNodes);
        SetVariable(StorageVariable.TRAVERSED_NODES, newTraversedNodes);
        SetSurveyNode(newNode);

        setCurrQuestionIdx(currQuestionIdx + 1);
        setAnswer("");
        setAnswerIndex(0);
    }

    function SaveAndContinue(e: FormEvent) {
        e.preventDefault();

        // TODO: Store the answers somewhere

        NextQuestion();
    }

    function Skip() {
        NextQuestion(true);
    }

    function GoBack() {
        const lastIndex = traversedSurveyNodes.length-1;
        const newCurrentNode = traversedSurveyNodes[lastIndex];
        const newTraversedNodes = traversedSurveyNodes.filter((_, i) => i < lastIndex);

        setTraversedSurveyNodes(newTraversedNodes);
        SetVariable(StorageVariable.TRAVERSED_NODES, newTraversedNodes);
        SetSurveyNode(newCurrentNode);

        setCurrQuestionIdx(currQuestionIdx - 1);
        setAnswer("");
        setAnswerIndex(0);
    }

    let surveyQuestion: SurveyQuestion | undefined = undefined;
    if (surveyNode) {
        surveyQuestion = surveyQuestions?.find(x => x.ID === surveyNode.QuestionId);
    }

    return <>
        {
            survey && questionOrder && surveyQuestions ?
                <>
                    <SurveyTitle title={survey.Title}></SurveyTitle>

                    <main>
                        {
                            surveyQuestion ?
                                <Form onSubmit={SaveAndContinue}>
                                    <Form.Label className="question-title mb-3">
                                        {surveyQuestion.Details.Title}
                                        {
                                            surveyQuestion.Help.length > 0?
                                            <QuestionCircle onClick={handleHelpModalShow} className="help-button ms-2"></QuestionCircle>
                                            :
                                            <></>
                                        }
                                    </Form.Label>

                                    {GetQuestionBody(surveyQuestion.QuestionType, surveyQuestion.Details)}

                                    <div className="survey-buttons">
                                        <div className="mt-5">
                                            <Button className="me-2" type="submit" variant="secondary">Continuar</Button>
                                            <Button onClick={GoBack} type="button" variant="secondary" disabled={traversedSurveyNodes.length === 0}>Volver</Button>
                                            <Button onClick={Skip} className="skip-button" type="button" variant="secondary">Saltar</Button>
                                        </div>

                                        <div className="mt-5 finish-button-container">
                                            <Button className="finish-button" type="button" variant="danger" onClick={FinishSurvey}>Terminar Encuesta</Button>
                                        </div>
                                    </div>

                                    <Modal size="lg" show={helpModalShow} onHide={handleHelpModalClose}>
                                    <Modal.Header closeButton>
                                        <Modal.Title>Ayuda Adicional</Modal.Title>
                                    </Modal.Header>
                                    <Modal.Body>
                                        {surveyQuestion.Help}
                                    </Modal.Body>
                                </Modal>
                                </Form>
                                :
                                <main>
                                    <LoadingScreen title="Cargando siguiente pregunta..."></LoadingScreen>
                                </main>
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

export default AnswerSurvey;