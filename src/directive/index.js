import mark from "./waterMark/mark";

export default function directive(app){
  app.directive('watermark', mark)
}
