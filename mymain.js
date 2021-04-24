var myLocalQuestionsObject = { questions: {} };
var curFilterInput = "";
var filterInputGiven = false;

// sending pasted images
var metadata = {
  contentType: "image/jpeg",
};

// parsing all questions
$("#btnall").on("click", () => {
  var allquestions = $("#inputall").val().trim();
  $("#inputall").val("");
  var allSplitted = allquestions.split("@^&&^@");
  var t = 0;
  for (let question of allSplitted) {
    window.setTimeout(
      (function (question) {
        return function () {
          $("#inputquestion").val(question);
          $("#btn").click();
        };
      })(question),
      t * 500
    );
    ++t;
  }
});

/***********Levenshtein dist code use it later.************/
function calculateLevDistance(src, tgt) {
  if (!(src && tgt)) {
    return false;
  }
  var realCost;
  var srcLength = src.length,
    tgtLength = tgt.length,
    tempString,
    tempLength; // for swapping

  var resultMatrix = new Array();
  resultMatrix[0] = new Array(); // Multi dimensional

  if (srcLength < tgtLength) {
    tempString = src;
    src = tgt;
    tgt = tempString;
    tempLength = srcLength;
    srcLength = tgtLength;
    tgtLength = tempLength;
  }

  for (var c = 0; c < tgtLength + 1; c++) {
    resultMatrix[0][c] = c;
  }

  for (var i = 1; i < srcLength + 1; i++) {
    resultMatrix[i] = new Array();
    resultMatrix[i][0] = i;
    for (var j = 1; j < tgtLength + 1; j++) {
      realCost = src.charAt(i - 1) === tgt.charAt(j - 1) ? 0 : 1;
      resultMatrix[i][j] = Math.min(
        resultMatrix[i - 1][j] + 1,
        resultMatrix[i][j - 1] + 1,
        resultMatrix[i - 1][j - 1] + realCost
      );
    }
  }

  return resultMatrix[srcLength][tgtLength];
}

// question submit event handler
$("#btn").on("click", handleNewQuestion);

function handleNewQuestion() {
  var newQuestion = $("#inputquestion").val().trim();

  if (newQuestion.includes("<script")) {
    return false;
  }

  if (newQuestion.length === 0) {
    return false;
  }
  $("#inputquestion").val("");
  // console.log(newQuestion);
  var threshold = 5;
  var minLevDistance = 2 * newQuestion.length;
  for (key in myLocalQuestionsObject["questions"]) {
    var question;
    if (myLocalQuestionsObject["questions"].hasOwnProperty(key)) {
      question = myLocalQuestionsObject["questions"][key];
    } else {
      continue;
    }
    minLevDistance = Math.min(
      minLevDistance,
      calculateLevDistance(question.question, newQuestion)
    );
  }
  if (minLevDistance < threshold) {
    console.log("Already exists");
  } else {
    var newQuestionObj = {
      question: newQuestion,
    };
    var key = firebase.database().ref("ffe_questions").push(newQuestionObj);
  }
}

// handle new comment
function handleNewComment(questionKey, newComment) {
  if (newComment.includes("<script")) {
    return false;
  }

  var newCommentObj = {
    comment: newComment,
    upvote: 0,
    downvote: 0,
  };

  return firebase
    .database()
    .ref("ffe_questions/" + questionKey + "/commentsArray")
    .push(newCommentObj);
}

// filter

// filter event handler
document.getElementById("filter").addEventListener("input", (event) => {
  curFilterInput = event.target.value;
  if (curFilterInput == "") filterInputGiven = false;
  else filterInputGiven = true;
  // var filterInputGiven = curFilterInput != "" ? 1 : 0;
  filter(myLocalQuestionsObject["questions"]);
});

// filter logic
function filter(questionsObject) {
  if (!filterInputGiven) {
    for (questionKey in questionsObject) {
      if (questionsObject.hasOwnProperty(questionKey))
        $("#" + questionKey).show();
    }
    return;
  }
  for (questionKey in questionsObject) {
    var question;
    if (questionsObject.hasOwnProperty(questionKey)) {
      question = questionsObject[questionKey];
      $("#" + questionKey).hide();
    } else {
      continue;
    }
    //not checking comments if question is matched, else checking options
    if (
      question.question.toLowerCase().indexOf(curFilterInput.toLowerCase()) !=
      -1
    ) {
      $("#" + questionKey).show();
      continue;
    }

    //looping through comments to check anything matches with curFilterInput and appending question if matched.
    for (commentKey in question["commentsArray"]) {
      var comment;
      if (question["commentsArray"].hasOwnProperty(commentKey)) {
        comment = question["commentsArray"][commentKey];
      } else {
        continue;
      }
      if (
        comment["comment"]
          .toLowerCase()
          .indexOf(curFilterInput.toLowerCase()) != -1
      ) {
        $("#" + questionKey).show();
        break;
      }
    }
  }
}

function updateVote(questionKey, commentKey, add) {
  if (myLocalQuestionsObject["questions"] == {}) return false;
  if (!myLocalQuestionsObject["questions"].hasOwnProperty(questionKey))
    return false;
  if (add == 1)
    myLocalQuestionsObject["questions"][questionKey]["commentsArray"][
      commentKey
    ]["upvote"] += 1;
  else
    myLocalQuestionsObject["questions"][questionKey]["commentsArray"][
      commentKey
    ]["downvote"] += 1;
  var updates = {};
  // updates["/users/"+firebase.auth().currentUser.uid] = {"count": };
  updates["/ffe_questions/" + questionKey] =
    myLocalQuestionsObject["questions"][questionKey];
  firebase.database().ref().update(updates);
}

var question_count = 0;

// given a question object, if exists update in DOM
// else create new HTML element and append to DOM
function updateQuestionDOM(questionKey, rebuild = false) {
  var $singleQuestion;
  if (!rebuild) {
    $singleQuestion = document.createElement("div");
    $singleQuestion.setAttribute("class", "bgff");
    $singleQuestion.setAttribute("id", questionKey);
    question_count++;
  } else {
    var g = document.getElementById(questionKey);
    g.innerHTML = "Updating...";
    $singleQuestion = g;
  }
  if (question_count > 0) $("#loading").hide();
  var questionObject = myLocalQuestionsObject["questions"][questionKey];

  var $theQuestion = document.createElement("p");
  $theQuestion.innerHTML = questionObject.question;
  $theQuestion.setAttribute("class", "qColor");

  var $commentSection = document.createElement("ul");

  var $inputnewAnswer = document.createElement("input");
  $inputnewAnswer.setAttribute("placeholder", "add new answer");

  var $inputButton = document.createElement("button");
  $inputButton.innerText = "Submit ans";
  $inputButton.setAttribute("class", "btnx");

  $inputButton.addEventListener("click", (e) => {
    var newAns = $inputnewAnswer.value.trim();
    if (newAns.length === 0) return false;
    handleNewComment(questionKey, newAns);
  });

  $inputnewAnswer.addEventListener("keydown", (e) => {
    if (e.code === "Enter" || e.code == "NumpadEnter") {
      var newAns = $inputnewAnswer.value.trim();
      if (newAns.length === 0) return false;
      handleNewComment(questionKey, newAns);
    }
  });

  $commentSection.appendChild($inputnewAnswer);
  $commentSection.appendChild($inputButton);

  if (!questionObject["commentsArray"]) {
    $singleQuestion.innerHTML = "";
    $singleQuestion.appendChild($theQuestion);
    $singleQuestion.appendChild($commentSection);
    if (!rebuild)
      document.getElementById("livesection").appendChild($singleQuestion);
    return;
  }

  for (commentKey in questionObject["commentsArray"]) {
    var comment;
    if (questionObject["commentsArray"].hasOwnProperty(commentKey))
      comment = questionObject["commentsArray"][commentKey];
    else continue;

    var $singleComment = document.createElement("li");

    var $theComment = document.createElement("span");
    $theComment.innerHTML = comment["comment"];
    $theComment.setAttribute("class", "combg");

    $votes = document.createElement("span");
    $votes.innerHTML = "Votes: " + (comment.upvote - comment.downvote);

    var $ubtn = document.createElement("button");
    $ubtn.setAttribute("class", "btnx");
    $ubtn.setAttribute("id", questionKey + "$$" + commentKey);
    $ubtn.innerHTML = "up";
    $ubtn.addEventListener(
      "click",
      (e) => {
        var location = e.target.id.split("$$");
        updateVote(location[0], location[1], 1);
      },
      { once: true }
    );

    var $dbtn = document.createElement("button");
    $dbtn.innerHTML = "down";
    $dbtn.setAttribute("class", "btnx");
    $dbtn.setAttribute("id", questionKey + "$$" + commentKey);
    $dbtn.addEventListener(
      "click",
      (e) => {
        var location = e.target.id.split("$$");
        updateVote(location[0], location[1], -1);
      },
      { once: true }
    );
    $singleComment.appendChild($votes);
    $singleComment.appendChild($ubtn);
    $singleComment.appendChild($dbtn);
    $singleComment.appendChild($theComment);
    $commentSection.appendChild($singleComment);
  }
  $singleQuestion.innerHTML = "";
  $singleQuestion.appendChild($theQuestion);
  $singleQuestion.appendChild($commentSection);
  if (!rebuild)
    document.getElementById("livesection").appendChild($singleQuestion);
}

async function fetchAll() {
  var db = firebase.database();
  // var user = await db.ref("users/" + firebase.auth().currentUser.uid).get().val();
  // if (user.count > 500) firebase.auth().signOut();
  var allquestions = await db.ref("ffe_questions/");
  allquestions.on("child_added", async (snapshot) => {
    var thatQuestion = await db.ref("ffe_questions/" + snapshot.key);
    async function overwrite(child_snapshot) {
      myLocalQuestionsObject["questions"][snapshot.key][
        child_snapshot.key
      ] = child_snapshot.val();

      updateQuestionDOM(snapshot.key, true);
    }
    myLocalQuestionsObject["questions"][snapshot.key] = snapshot.val();
    updateQuestionDOM(snapshot.key);
    thatQuestion.on("child_changed", overwrite);
    thatQuestion.on("child_added", overwrite);
    filter(myLocalQuestionsObject["questions"]);
  });
  // allquestions.on("child_removed", async (snapshot) => {
  //   var removedQuestion = snapshot.val();
  //   delete myLocalQuestionsObject.
  // });
}

var FFZZ = [
  527600736,
  -589989265,
  372879977,
  447338135,
  521919843,
  -1830535072,
  -1248500820,
  -1076934028,
  544126340,
  251437670,
  -841051550,
  -1997410943,
  835092320,
  816134498,
  -2137884095,
  -1217876447,
  1968398547,
  -90260357,
  -476978997,
  -888809510,
  1766371920,
  1706254585,
  353535965,
  -2050401371,
  845893951,
  -1078545862,
  -1851029633,
  -1973927804,
  -1194039966,
  -864596553,
  -583174992,
  -1076757537,
  1849485868,
  1798638304,
  368904646,
  -17205004,
  939682051,
  407294410,
  -1761177958,
  425204862,
  -1190342866,
  2449877,
  160669371,
  -1248408629,
  1706341016,
  1309132755,
  -240487642,
  -986040381,
  1849366831,
  -1766003322,
  1596478313,
  81057117,
  930169954,
  819380921,
  -60887363,
  -1200852706,
  140344988,
  -1334939272,
  1710040898,
  -1166304507,
  2032339233,
  541241536,
  -1050711902,
  -1945139383,
  -1825020253,
  -921078025,
];

// Cryptographic for checking phone numbers
// Not yet used this function #todo
const digest = async ({ algorithm = "SHA-256", message }) =>
  Array.prototype.map
    .call(
      new Uint8Array(
        await crypto.subtle.digest(algorithm, new TextEncoder().encode(message))
      ),
      (x) => ("0" + x.toString(16)).slice(-2)
    )
    .join("");

digest({ message: "hello" }).then(console.log);

$("#main").hide();
firebase.auth().onAuthStateChanged(
  function (user) {
    if (user) {
      // console.log(user);
      if (
        FFZZ.includes(
          user.phoneNumber.split("").reduce(function (a, b) {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
          }, 0)
        )
      ) {
        $("#main").show();
        fetchAll();
      } else {
        alert("No Entry");
        window.location.href = "login.html";
      }
    } else {
      window.location.href = "login.html";
    }
  },
  function (error) {
    console.log(error);
  }
);

document.onpaste = async function (event) {
  var storageRef = firebase.storage().ref();
  var items = (event.clipboardData || event.originalEvent.clipboardData).items;
  // console.log(JSON.stringify(items)); // will give you the mime types
  for (index in items) {
    var item = items[index];
    if (item.kind === "file") {
      var blob = item.getAsFile();
      let randString = Math.random().toString(36).substring(7);
      var uploadTask = storageRef
        .child("images/" + randString)
        .put(blob, metadata);
      $("#imgstatus").val("Uploading");
      uploadTask.on(
        "state_changed",
        function (snapshot) {},
        function (error) {},
        function () {
          uploadTask.snapshot.ref.getDownloadURL().then(function (downloadURL) {
            var question = "<img src='" + downloadURL + "'/>";
            $("#imgstatus").val("Uploaded! (Ready.)");
            $("#inputquestion").val(question);
            $("#btn").click();
          });
        }
      );
    }
  }
};
