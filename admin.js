const workerurl = "https://peedabloo.desaipahal64.workers.dev"

let allentries = []
let allaccounts = []
let chosenstudent = ""
let chosenbatch = ""
let chosensubject = ""
let chosenchapter = ""

function findtag(elemid) {
  return document.getElementById(elemid)
}

async function loginadmin() {
  let adminpass = findtag("teacherkey").value.trim()
  let statuslabel = findtag("adminstatus")

  if (!adminpass) {
    statuslabel.innerText = "please enter password"
    return
  }

  statuslabel.innerText = "authorizing..."

  try {
    let servreply = await fetch(workerurl + "/api/adminsearch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ adminpassword: adminpass })
    })
    let parsedres = await servreply.json()
    if (parsedres.success) {
      statuslabel.innerText = ""
      allentries = parsedres.records || []
      allaccounts = parsedres.accounts || []
      findtag("adminloginbox").classList.add("hidden")
      findtag("studentssection").classList.remove("hidden")
      renderstudentsview()
    } else {
      statuslabel.innerText = parsedres.error || "access denied"
    }
  } catch (err) {
    statuslabel.innerText = "connection error"
  }
}

function renderstudentsview() {
  let searchtext = findtag("studentsearchbox").value.toLowerCase().trim()
  let studentsmap = {}

  for (let acc of allaccounts) {
    let studentkey = (acc.studentname || "") + "___" + (acc.studentbatch || "")
    studentsmap[studentkey] = {
      name: acc.studentname || "",
      batch: acc.studentbatch || "",
      subjects: new Set(),
      chapters: 0
    }
  }

  for (let row of allentries) {
    let studentkey = (row.studentname || "") + "___" + (row.studentbatch || "")
    if (!studentsmap[studentkey]) {
      studentsmap[studentkey] = {
        name: row.studentname || "",
        batch: row.studentbatch || "",
        subjects: new Set(),
        chapters: 0
      }
    }
    if (row.subjectname) {
      studentsmap[studentkey].subjects.add(row.subjectname)
    }
    if (row.chaptername && row.chaptername.trim() !== "") {
      studentsmap[studentkey].chapters += 1
    }
  }

  let studentarray = Object.values(studentsmap)
  let filteredstudents = studentarray.filter(item => {
    let namematch = item.name.toLowerCase().includes(searchtext)
    let batchmatch = item.batch.toLowerCase().includes(searchtext)
    return namematch || batchmatch
  })

  findtag("studentcountlabel").innerText = filteredstudents.length + " students"
  let studentlistnode = findtag("studentslist")

  if (filteredstudents.length === 0) {
    studentlistnode.innerHTML = "<div class='subtext' style='padding:10px 0'>no students found</div>"
    return
  }

  let studhtml = ""
  for (let eachstud of filteredstudents) {
    let subcount = eachstud.subjects.size
    let chapcount = eachstud.chapters
    let countbadge = subcount + (subcount === 1 ? " subject" : " subjects") + " • " + chapcount + (chapcount === 1 ? " chapter" : " chapters")

    studhtml += "<div class='cardbtn' onclick='pickstudent(\"" + encodeURIComponent(eachstud.name) + "\", \"" + encodeURIComponent(eachstud.batch) + "\")'>"
    studhtml += "<div><div class='cardtitle'>" + eachstud.name + "</div><div class='cardmeta'>batch: " + eachstud.batch + "</div></div>"
    studhtml += "<span class='badge'>" + countbadge + " &rarr;</span>"
    studhtml += "</div>"
  }
  studentlistnode.innerHTML = studhtml
}

function filterstudents() {
  renderstudentsview()
}

function pickstudent(stuname, stubatch) {
  chosenstudent = decodeURIComponent(stuname)
  chosenbatch = decodeURIComponent(stubatch)

  findtag("studentssection").classList.add("hidden")
  findtag("chapterssection").classList.add("hidden")
  findtag("progresssection").classList.add("hidden")
  findtag("subjectssection").classList.remove("hidden")

  findtag("currentstudenttitle").innerText = chosenstudent + " (" + chosenbatch + ")"
  findtag("subjectsearchbox").value = ""

  rendersubjectsview()
}

function rendersubjectsview() {
  let searchtext = findtag("subjectsearchbox").value.toLowerCase().trim()
  let studrecords = allentries.filter(r => r.studentname === chosenstudent && r.studentbatch === chosenbatch)

  let subjectsmap = {}
  for (let row of studrecords) {
    if (row.subjectname) {
      if (!subjectsmap[row.subjectname]) {
        subjectsmap[row.subjectname] = 0
      }
      if (row.chaptername && row.chaptername.trim() !== "") {
        subjectsmap[row.subjectname] += 1
      }
    }
  }

  let subjectnames = Object.keys(subjectsmap)
  let filteredsubjects = subjectnames.filter(s => s.toLowerCase().includes(searchtext))

  findtag("subjectcountlabel").innerText = filteredsubjects.length + " subjects"
  let sublistnode = findtag("subjectslist")

  if (filteredsubjects.length === 0) {
    sublistnode.innerHTML = "<div class='subtext' style='padding:10px 0'>no subjects found for this student</div>"
    return
  }

  let subhtml = ""
  for (let eachsub of filteredsubjects) {
    let chapcount = subjectsmap[eachsub]
    let sublabel = chapcount === 1 ? "1 chapter" : chapcount + " chapters"

    subhtml += "<div class='cardbtn' onclick='picksubject(\"" + encodeURIComponent(eachsub) + "\")'>"
    subhtml += "<div><div class='cardtitle'>" + eachsub + "</div><div class='cardmeta'>click to browse chapters</div></div>"
    subhtml += "<span class='badge'>" + sublabel + " &rarr;</span>"
    subhtml += "</div>"
  }
  sublistnode.innerHTML = subhtml
}

function filtersubjects() {
  rendersubjectsview()
}

function picksubject(subname) {
  chosensubject = decodeURIComponent(subname)

  findtag("subjectssection").classList.add("hidden")
  findtag("progresssection").classList.add("hidden")
  findtag("chapterssection").classList.remove("hidden")

  findtag("subjectbreadcrumb").innerText = chosenstudent + " > " + chosensubject
  findtag("currentsubjecttitle").innerText = chosensubject
  findtag("chaptersearchbox").value = ""

  renderchaptersview()
}

function renderchaptersview() {
  let searchtext = findtag("chaptersearchbox").value.toLowerCase().trim()
  let subjectrecords = allentries.filter(r => r.studentname === chosenstudent && r.studentbatch === chosenbatch && r.subjectname === chosensubject)

  let chapterslist = []
  for (let row of subjectrecords) {
    if (row.chaptername && row.chaptername.trim() !== "" && !chapterslist.includes(row.chaptername)) {
      chapterslist.push(row.chaptername)
    }
  }

  let filteredchapters = chapterslist.filter(c => c.toLowerCase().includes(searchtext))
  findtag("chaptercountlabel").innerText = filteredchapters.length + " chapters"

  let chaplistnode = findtag("chapterslist")
  if (filteredchapters.length === 0) {
    chaplistnode.innerHTML = "<div class='subtext' style='padding:10px 0'>no chapters found in " + chosensubject + "</div>"
    return
  }

  let chaphtml = ""
  for (let eachchap of filteredchapters) {
    let targetrecord = subjectrecords.find(entry => entry.chaptername === eachchap)
    let previewbadge = targetrecord && targetrecord.dppprogress ? "DPP: " + targetrecord.dppprogress : "view progress"

    chaphtml += "<div class='cardbtn' onclick='pickchapter(\"" + encodeURIComponent(eachchap) + "\")'>"
    chaphtml += "<div><div class='cardtitle'>" + eachchap + "</div><div class='cardmeta'>" + chosensubject + "</div></div>"
    chaphtml += "<span class='badge'>" + previewbadge + " &rarr;</span>"
    chaphtml += "</div>"
  }
  chaplistnode.innerHTML = chaphtml
}

function filterchapters() {
  renderchaptersview()
}

function pickchapter(chapname) {
  chosenchapter = decodeURIComponent(chapname)

  findtag("chapterssection").classList.add("hidden")
  findtag("progresssection").classList.remove("hidden")

  findtag("progressbreadcrumb").innerText = chosenstudent + " > " + chosensubject + " > " + chosenchapter
  findtag("currentchaptertitle").innerText = chosenchapter

  renderprogressview()
}

function renderprogressview() {
  let progressrecord = allentries.find(r => r.studentname === chosenstudent && r.studentbatch === chosenbatch && r.subjectname === chosensubject && r.chaptername === chosenchapter)

  findtag("dppdisplay").innerText = (progressrecord && progressrecord.dppprogress) || "not completed"
  findtag("prabaldisplay").innerText = (progressrecord && progressrecord.prabalprogress) || "not completed"
  findtag("parikshitdisplay").innerText = (progressrecord && progressrecord.parikshitprogress) || "not completed"
  findtag("pyqdisplay").innerText = (progressrecord && progressrecord.pyqsprogress) || "not completed"
}

function backtostudents() {
  findtag("subjectssection").classList.add("hidden")
  findtag("chapterssection").classList.add("hidden")
  findtag("progresssection").classList.add("hidden")
  findtag("studentssection").classList.remove("hidden")
}

function backtosubjects() {
  findtag("chapterssection").classList.add("hidden")
  findtag("progresssection").classList.add("hidden")
  findtag("subjectssection").classList.remove("hidden")
}

function backtochapters() {
  findtag("progresssection").classList.add("hidden")
  findtag("chapterssection").classList.remove("hidden")
}
