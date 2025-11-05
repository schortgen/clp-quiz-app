
import { generalKnowledgeQuestions } from './general_knowledge';
import { airBrakesQuestions } from './air_brakes';
import { combinationQuestions } from './combination';
import { hazardousMaterialsQuestions } from './hazardous_materials';
import { tankerQuestions } from './tanker';
import { doubleTripleTrailersQuestions } from './double_triple_trailers';
import { passengerQuestions } from './passenger';
import { schoolBusQuestions } from './school_bus';


interface RawQuizData {
  [key: string]: string;
}

export const rawQuizData: RawQuizData = {
  general_knowledge: generalKnowledgeQuestions,
  air_brakes: airBrakesQuestions,
  combination: combinationQuestions,
  hazardous_materials: hazardousMaterialsQuestions,
  tanker: tankerQuestions,
  double_triple_trailers: doubleTripleTrailersQuestions,
  passenger: passengerQuestions,
  school_bus: schoolBusQuestions,
};
