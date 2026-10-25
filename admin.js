const workerurl = "https://peedabloo.desaipahal64.workers.dev"
const banhammerurl = "https://media1.tenor.com/m/QDcCvx0Tg5cAAAAC/thorban.gif"

// Preload the Thor Ban GIF for instant playback
const preloadedbangif = new Image()
preloadedbangif.src = banhammerurl

let verifiedadminsecret = ""
let teacherauthmode = "login"
let activeteacher = null // { name, subject, pin }
let allentries = []
let allaccounts = []
let alltasks = []

let chosenbatch = ""
let chosenstudent = ""
let chosensubject = ""
let chosenchapter = ""
let currenttasktarget = "batch" // 'batch' or 'student'

function findtag(elemid) {
  return document.getElementById(elemid)
}

// -----------------------------------------------------------------------------
// Master Admin Gatekeeper ("topsecret" protection before login/signup)
// -----------------------------------------------------------------------------
function initadminportal() {
  let savedsecret = sessionStorage.getItem("pw_admin_secret")
  if (savedsecret) {
    verifiedadminsecret = savedsecret
    let gate = findtag("admingatebox")
    let auth = findtag("teacherauthbox")
    if (gate) gate.classList.add("hidden")
    if (auth) auth.classList.remove("hidden")
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initadminportal)
} else {
  initadminportal()
}

async function verifymasterpassword() {
  let input = (findtag("masteradminpasswordinput").value || "").trim()
  let statusmsg = findtag("gatestatusmsg")
  let unlockbtn = findtag("unlockgatebtn")

  if (!input) {
    statusmsg.innerText = "Please enter the master admin password."
    return
  }

  statusmsg.innerText = "Verifying master admin password..."
  if (unlockbtn) unlockbtn.disabled = true

  try {
    let res = await fetch(workerurl + "/api/verifyadminpass", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ adminpassword: input })
    })
    let json = await res.json()
    if (unlockbtn) unlockbtn.disabled = false

    if (json.success) {
      verifiedadminsecret = input
      sessionStorage.setItem("pw_admin_secret", input)
      statusmsg.innerText = ""
      findtag("admingatebox").classList.add("hidden")
      findtag("teacherauthbox").classList.remove("hidden")
      let nameinput = findtag("teachernameinput")
      if (nameinput) nameinput.focus()
    } else {
      statusmsg.innerText = json.error || "Incorrect master admin password. Access denied."
    }
  } catch (err) {
    if (unlockbtn) unlockbtn.disabled = false
    statusmsg.innerText = "Connection error while verifying password."
  }
}

function lockadminportal() {
  verifiedadminsecret = ""
  sessionStorage.removeItem("pw_admin_secret")
  doteacherlogout()
  findtag("teacherauthbox").classList.add("hidden")
  findtag("admingatebox").classList.remove("hidden")
  let passinput = findtag("masteradminpasswordinput")
  if (passinput) {
    passinput.value = ""
    passinput.focus()
  }
  findtag("gatestatusmsg").innerText = ""
}

// -----------------------------------------------------------------------------
// Teacher Authentication (Login & Signup tabs)
// -----------------------------------------------------------------------------
function switchteacherauthmode(mode) {
  teacherauthmode = mode
  let loginbtn = findtag("tabteacherloginbtn")
  let signupbtn = findtag("tabteachersignupbtn")
  let heading = findtag("teacherauthheading")
  let subtext = findtag("teacherauthsubtext")
  let submitbtn = findtag("teacherauthsubmitbtn")
  let switchbox = findtag("teacherauthswitchbox")
  let statusmsg = findtag("teacherauthstatus")

  statusmsg.innerText = ""

  if (teacherauthmode === "login") {
    loginbtn.classList.add("authtabactive")
    signupbtn.classList.remove("authtabactive")
    heading.innerText = "Teacher Login"
    subtext.innerText = "Enter your name, subject taught, and pin to log in to the admin portal."
    submitbtn.innerText = "Log in"
    switchbox.innerHTML = "Don't have a teacher account? <a href='javascript:void(0)' onclick='switchteacherauthmode(\"signup\")' class='navlink'>sign up here</a>"
  } else {
    signupbtn.classList.add("authtabactive")
    loginbtn.classList.remove("authtabactive")
    heading.innerText = "Create Teacher Account"
    subtext.innerText = "Choose your name, subject taught, and pin to create your teacher portal account."
    submitbtn.innerText = "Create Teacher Account"
    switchbox.innerHTML = "Already have a teacher account? <a href='javascript:void(0)' onclick='switchteacherauthmode(\"login\")' class='navlink'>log in here</a>"
  }
}

async function handleteacherauth() {
  if (!verifiedadminsecret) {
    lockadminportal()
    alert("Master admin password verification is required before accessing teacher portal.")
    return
  }

  let name = (findtag("teachernameinput").value || "").trim()
  let subject = (findtag("teachersubjectinput").value || "").trim()
  let pin = (findtag("teacherpininput").value || "").trim()
  let statusmsg = findtag("teacherauthstatus")

  if (!name || !subject || !pin) {
    statusmsg.innerText = "Please enter teacher name, subject taught, and personal pin / password."
    return
  }

  if (teacherauthmode === "signup") {
    statusmsg.innerText = "Creating teacher account..."
    try {
      let regres = await fetch(workerurl + "/api/teachersignup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adminpassword: verifiedadminsecret,
          teachername: name,
          teachersubject: subject,
          teacherpin: pin
        })
      })
      let regjson = await regres.json()
      if (!regjson.success) {
        statusmsg.innerText = regjson.error || "Failed to create teacher account"
        return
      }
      statusmsg.innerText = "Account created! Logging you in..."
    } catch (err) {
      statusmsg.innerText = "Connection error during teacher registration."
      return
    }
  } else {
    statusmsg.innerText = "Authorizing teacher..."
  }

  try {
    let authres = await fetch(workerurl + "/api/teacherlogin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        adminpassword: verifiedadminsecret,
        teachername: name,
        teachersubject: subject,
        teacherpin: pin
      })
    })
    let authjson = await authres.json()
    if (authjson.success) {
      activeteacher = {
        name: (authjson.teacher && authjson.teacher.name) || name,
        subject: (authjson.teacher && authjson.teacher.subject) || subject,
        pin: pin
      }
      allentries = authjson.records || []
      allaccounts = authjson.accounts || []
      alltasks = authjson.tasks || []

      statusmsg.innerText = ""
      findtag("loggedteachername").innerText = activeteacher.name
      findtag("loggedteachersubject").innerText = "Subject: " + activeteacher.subject

      findtag("teacherauthbox").classList.add("hidden")
      findtag("teacherprofilebar").classList.remove("hidden")
      findtag("batchessection").classList.remove("hidden")

      renderbatchesview()
    } else {
      statusmsg.innerText = authjson.error || "Access denied"
    }
  } catch (err) {
    statusmsg.innerText = "Connection error during login."
  }
}

function doteacherlogout() {
  activeteacher = null
  allentries = []
  allaccounts = []
  alltasks = []
  chosenbatch = ""
  chosenstudent = ""
  chosensubject = ""
  chosenchapter = ""

  let pininput = findtag("teacherpininput")
  if (pininput) pininput.value = ""
  findtag("teacherprofilebar").classList.add("hidden")
  findtag("batchessection").classList.add("hidden")
  findtag("batchstudentssection").classList.add("hidden")
  findtag("subjectssection").classList.add("hidden")
  findtag("chapterssection").classList.add("hidden")
  findtag("progresssection").classList.add("hidden")

  if (verifiedadminsecret) {
    findtag("teacherauthbox").classList.remove("hidden")
  } else {
    findtag("admingatebox").classList.remove("hidden")
  }
}

// -----------------------------------------------------------------------------
// Helper: Distinct Batches & Students Extraction
// -----------------------------------------------------------------------------
function getdistinctbatches() {
  let batchmap = {}

  for (let acc of allaccounts) {
    let bname = (acc.studentbatch || "").trim()
    if (!bname) continue
    if (!batchmap[bname]) {
      batchmap[bname] = new Set()
    }
    if (acc.studentname) {
      batchmap[bname].add(acc.studentname.trim())
    }
  }

  for (let row of allentries) {
    let bname = (row.studentbatch || "").trim()
    if (!bname) continue
    if (!batchmap[bname]) {
      batchmap[bname] = new Set()
    }
    if (row.studentname) {
      batchmap[bname].add(row.studentname.trim())
    }
  }

  let list = []
  for (let bname of Object.keys(batchmap).sort()) {
    list.push({
      batch: bname,
      studentcount: batchmap[bname].size,
      students: Array.from(batchmap[bname]).sort()
    })
  }
  return list
}

function getstudentsforbatch(bname) {
  let studentsmap = {}

  for (let acc of allaccounts) {
    if ((acc.studentbatch || "").trim() === bname) {
      let sname = (acc.studentname || "").trim()
      if (!studentsmap[sname]) {
        studentsmap[sname] = {
          name: sname,
          batch: bname,
          subjects: new Set(),
          chapters: 0
        }
      }
    }
  }

  for (let row of allentries) {
    if ((row.studentbatch || "").trim() === bname) {
      let sname = (row.studentname || "").trim()
      if (!studentsmap[sname]) {
        studentsmap[sname] = {
          name: sname,
          batch: bname,
          subjects: new Set(),
          chapters: 0
        }
      }
      if (row.subjectname) {
        studentsmap[sname].subjects.add(row.subjectname)
      }
      if (row.chaptername && row.chaptername.trim() !== "") {
        studentsmap[sname].chapters += 1
      }
    }
  }

  return Object.values(studentsmap).sort((a, b) => a.name.localeCompare(b.name))
}

// -----------------------------------------------------------------------------
// LEVEL 1: Batches Directory
// -----------------------------------------------------------------------------
function renderbatchesview() {
  let searchtext = (findtag("batchsearchbox").value || "").toLowerCase().trim()
  let batches = getdistinctbatches()
  let filtered = batches.filter(b => b.batch.toLowerCase().includes(searchtext))

  findtag("batchcountlabel").innerText = filtered.length + (filtered.length === 1 ? " batch" : " batches")
  let listnode = findtag("batcheslist")

  if (filtered.length === 0) {
    listnode.innerHTML = "<div class='subtext' style='padding:12px 0'>no batches found</div>"
    return
  }

  let html = ""
  for (let item of filtered) {
    let studentlabel = item.studentcount + (item.studentcount === 1 ? " student" : " students")
    html += "<div class='cardbtn' onclick='pickbatch(\"" + encodeURIComponent(item.batch) + "\")'>"
    html += "  <div class='cardinfo'>"
    html += "    <div class='cardtitle-row'>"
    html += "      <span class='cardtitle'>Batch: " + item.batch + "</span>"
    html += "      <button type='button' class='actionpillbtn' onclick='event.stopPropagation();opentaskmodal(\"batch\", \"" + encodeURIComponent(item.batch) + "\")' title='Assign task to this entire batch'>Assign Task</button>"
    html += "    </div>"
    html += "    <div class='cardmeta'>" + studentlabel + " enrolled</div>"
    html += "  </div>"
    html += "  <span class='badge cardbadge'>" + studentlabel + " &rarr;</span>"
    html += "</div>"
  }
  listnode.innerHTML = html
}

function filterbatches() {
  renderbatchesview()
}

function pickbatch(batchEnc) {
  chosenbatch = decodeURIComponent(batchEnc)

  findtag("batchessection").classList.add("hidden")
  findtag("subjectssection").classList.add("hidden")
  findtag("chapterssection").classList.add("hidden")
  findtag("progresssection").classList.add("hidden")
  findtag("batchstudentssection").classList.remove("hidden")

  findtag("currentbatchtitle").innerText = "Batch: " + chosenbatch
  findtag("batchstudentsearchbox").value = ""
  renderbatchstudentsview()
}

function backtobatches() {
  chosenbatch = ""
  chosenstudent = ""
  chosensubject = ""
  chosenchapter = ""

  findtag("batchstudentssection").classList.add("hidden")
  findtag("subjectssection").classList.add("hidden")
  findtag("chapterssection").classList.add("hidden")
  findtag("progresssection").classList.add("hidden")
  findtag("batchessection").classList.remove("hidden")

  renderbatchesview()
}

// -----------------------------------------------------------------------------
// LEVEL 2: Batch Students Directory
// -----------------------------------------------------------------------------
function renderbatchstudentsview() {
  let searchtext = (findtag("batchstudentsearchbox").value || "").toLowerCase().trim()
  let students = getstudentsforbatch(chosenbatch)
  let filtered = students.filter(s => s.name.toLowerCase().includes(searchtext))

  findtag("batchstudentcountlabel").innerText = filtered.length + (filtered.length === 1 ? " student" : " students")
  let listnode = findtag("batchstudentslist")

  if (filtered.length === 0) {
    listnode.innerHTML = "<div class='subtext' style='padding:12px 0'>no students found in batch " + chosenbatch + "</div>"
    return
  }

  let html = ""
  for (let s of filtered) {
    let subcount = s.subjects.size
    let chapcount = s.chapters
    let countbadge = subcount + (subcount === 1 ? " subject" : " subjects") + " • " + chapcount + (chapcount === 1 ? " chapter" : " chapters")

    html += "<div class='cardbtn' onclick='pickstudent(\"" + encodeURIComponent(s.name) + "\", \"" + encodeURIComponent(s.batch) + "\")'>"
    html += "  <div class='cardinfo'>"
    html += "    <div class='cardtitle-row'>"
    html += "      <span class='cardtitle'>" + s.name + "</span>"
    html += "      <button type='button' class='actionpillbtn' onclick='event.stopPropagation();opentaskmodal(\"student\", \"" + encodeURIComponent(s.batch) + "\", \"" + encodeURIComponent(s.name) + "\")' title='Assign task to this individual student'>Task</button>"
    html += "      <button type='button' class='delbtn' onclick='deletestudent(event, \"" + encodeURIComponent(s.name) + "\", \"" + encodeURIComponent(s.batch) + "\")' title='delete student account'>delete</button>"
    html += "    </div>"
    html += "    <div class='cardmeta'>batch: " + s.batch + "</div>"
    html += "  </div>"
    html += "  <span class='badge cardbadge'>" + countbadge + " &rarr;</span>"
    html += "</div>"
  }
  listnode.innerHTML = html
}

function filterbatchstudents() {
  renderbatchstudentsview()
}

function backtobatchstudents() {
  chosenstudent = ""
  chosensubject = ""
  chosenchapter = ""

  findtag("subjectssection").classList.add("hidden")
  findtag("chapterssection").classList.add("hidden")
  findtag("progresssection").classList.add("hidden")
  findtag("batchstudentssection").classList.remove("hidden")

  renderbatchstudentsview()
}

// -----------------------------------------------------------------------------
// LEVEL 3: Student Subjects View
// -----------------------------------------------------------------------------
function pickstudent(stunameEnc, stubatchEnc) {
  chosenstudent = decodeURIComponent(stunameEnc)
  chosenbatch = decodeURIComponent(stubatchEnc)

  findtag("batchstudentssection").classList.add("hidden")
  findtag("chapterssection").classList.add("hidden")
  findtag("progresssection").classList.add("hidden")
  findtag("subjectssection").classList.remove("hidden")

  findtag("backtobatchstudentsbtn").innerText = "← back to batch " + chosenbatch
  findtag("currentstudenttitle").innerText = chosenstudent + " (" + chosenbatch + ")"
  findtag("subjectsearchbox").value = ""

  rendersubjectsview()
}

function rendersubjectsview() {
  let searchtext = (findtag("subjectsearchbox").value || "").toLowerCase().trim()
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

  let subjectnames = Object.keys(subjectsmap).sort()
  let filteredsubjects = subjectnames.filter(s => s.toLowerCase().includes(searchtext))

  findtag("subjectcountlabel").innerText = filteredsubjects.length + (filteredsubjects.length === 1 ? " subject" : " subjects")
  let sublistnode = findtag("subjectslist")

  if (filteredsubjects.length === 0) {
    sublistnode.innerHTML = "<div class='subtext' style='padding:12px 0'>no subjects found for this student</div>"
    return
  }

  let subhtml = ""
  for (let eachsub of filteredsubjects) {
    let chapcount = subjectsmap[eachsub]
    let sublabel = chapcount === 1 ? "1 chapter" : chapcount + " chapters"

    subhtml += "<div class='cardbtn' onclick='picksubject(\"" + encodeURIComponent(eachsub) + "\")'>"
    subhtml += "  <div class='cardinfo'>"
    subhtml += "    <div class='cardtitle'>" + eachsub + "</div>"
    subhtml += "    <div class='cardmeta'>click to browse chapters</div>"
    subhtml += "  </div>"
    subhtml += "  <span class='badge cardbadge'>" + sublabel + " &rarr;</span>"
    subhtml += "</div>"
  }
  sublistnode.innerHTML = subhtml
}

function filtersubjects() {
  rendersubjectsview()
}

function backtosubjects() {
  findtag("chapterssection").classList.add("hidden")
  findtag("progresssection").classList.add("hidden")
  findtag("subjectssection").classList.remove("hidden")
}

// -----------------------------------------------------------------------------
// LEVEL 4: Chapters View
// -----------------------------------------------------------------------------
function picksubject(subnameEnc) {
  chosensubject = decodeURIComponent(subnameEnc)

  findtag("subjectssection").classList.add("hidden")
  findtag("progresssection").classList.add("hidden")
  findtag("chapterssection").classList.remove("hidden")

  findtag("subjectbreadcrumb").innerText = chosenstudent + " > " + chosensubject
  findtag("currentsubjecttitle").innerText = chosensubject
  findtag("chaptersearchbox").value = ""

  renderchaptersview()
}

function renderchaptersview() {
  let searchtext = (findtag("chaptersearchbox").value || "").toLowerCase().trim()
  let subjectrecords = allentries.filter(r => r.studentname === chosenstudent && r.studentbatch === chosenbatch && r.subjectname === chosensubject)

  let chapterslist = []
  for (let row of subjectrecords) {
    if (row.chaptername && row.chaptername.trim() !== "" && !chapterslist.includes(row.chaptername)) {
      chapterslist.push(row.chaptername)
    }
  }

  let filteredchapters = chapterslist.filter(c => c.toLowerCase().includes(searchtext))
  findtag("chaptercountlabel").innerText = filteredchapters.length + (filteredchapters.length === 1 ? " chapter" : " chapters")

  let chaplistnode = findtag("chapterslist")
  if (filteredchapters.length === 0) {
    chaplistnode.innerHTML = "<div class='subtext' style='padding:12px 0'>no chapters found in " + chosensubject + "</div>"
    return
  }

  let chaphtml = ""
  for (let eachchap of filteredchapters) {
    let targetrecord = subjectrecords.find(entry => entry.chaptername === eachchap)
    let previewbadge = targetrecord && targetrecord.dppprogress ? "DPP: " + targetrecord.dppprogress : "view progress"

    chaphtml += "<div class='cardbtn' onclick='pickchapter(\"" + encodeURIComponent(eachchap) + "\")'>"
    chaphtml += "  <div class='cardinfo'>"
    chaphtml += "    <div class='cardtitle'>" + eachchap + "</div>"
    chaphtml += "    <div class='cardmeta'>" + chosensubject + "</div>"
    chaphtml += "  </div>"
    chaphtml += "  <span class='badge cardbadge'>" + previewbadge + " &rarr;</span>"
    chaphtml += "</div>"
  }
  chaplistnode.innerHTML = chaphtml
}

function filterchapters() {
  renderchaptersview()
}

function backtochapters() {
  findtag("progresssection").classList.add("hidden")
  findtag("chapterssection").classList.remove("hidden")
}

// -----------------------------------------------------------------------------
// LEVEL 5: Progress View & Photo Verification
// -----------------------------------------------------------------------------
function pickchapter(chapnameEnc) {
  chosenchapter = decodeURIComponent(chapnameEnc)

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

  renderadminphoto("dppphotoarea", progressrecord && progressrecord.dppphoto, "DPP Photo")
  renderadminphoto("prabalphotoarea", progressrecord && progressrecord.prabalphoto, "Prabal Photo")
  renderadminphoto("parikshitphotoarea", progressrecord && progressrecord.parikshitphoto, "Parikshit Photo")
  renderadminphoto("pyqphotoarea", progressrecord && progressrecord.pyqsphoto, "PYQs Photo")
}

function renderadminphoto(containerId, photoData, label) {
  let container = findtag(containerId)
  if (!container) return
  if (!photoData) {
    container.innerHTML = "<div class='nophototext'>no photo attached</div>"
    return
  }
  container.innerHTML = `
    <div class="adminphotobox">
      <img src="${photoData}" class="adminphotothumb" alt="${label}" onclick="openphotolightbox(this.src)">
      <span class="clicktoexpandhint" onclick="openphotolightbox('${photoData}')">view full photo</span>
    </div>
  `
}

function openphotolightbox(src) {
  let lightbox = findtag("photolightbox")
  let lightboximg = findtag("lightboximg")
  if (lightbox && lightboximg) {
    lightboximg.src = src
    lightbox.classList.remove("hidden")
  }
}

function closephotolightbox() {
  let lightbox = findtag("photolightbox")
  let lightboximg = findtag("lightboximg")
  if (lightbox) {
    lightbox.classList.add("hidden")
  }
  if (lightboximg) {
    lightboximg.src = ""
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closephotolightbox()
    closetaskmodal()
    closetaskslistmodal()
  }
})

// -----------------------------------------------------------------------------
// Task Assignment Feature (Whole Batch or Individual Student)
// -----------------------------------------------------------------------------
function settasktarget(targetType) {
  currenttasktarget = targetType
  let batchbtn = findtag("targetbatchbtn")
  let studentbtn = findtag("targetstudentbtn")
  let studcontainer = findtag("taskstudentselectgroup")

  if (targetType === "batch") {
    batchbtn.classList.add("active")
    studentbtn.classList.remove("active")
    studcontainer.classList.add("hidden")
  } else {
    studentbtn.classList.add("active")
    batchbtn.classList.remove("active")
    studcontainer.classList.remove("hidden")
  }
}

function ontaskbatchchanged() {
  let batchname = findtag("taskbatchselect").value
  let studentselect = findtag("taskstudentselect")
  studentselect.innerHTML = ""

  let students = getstudentsforbatch(batchname)
  if (students.length === 0) {
    let opt = document.createElement("option")
    opt.value = ""
    opt.innerText = "No students in this batch"
    studentselect.appendChild(opt)
    return
  }

  for (let s of students) {
    let opt = document.createElement("option")
    opt.value = s.name
    opt.innerText = s.name
    studentselect.appendChild(opt)
  }
}

function opentaskmodal(targetType, batchEnc, studentEnc) {
  if (!activeteacher) {
    alert("Please log in as a teacher first.")
    return
  }

  let batchname = batchEnc ? decodeURIComponent(batchEnc) : (chosenbatch || "")
  let studentname = studentEnc ? decodeURIComponent(studentEnc) : (chosenstudent || "")

  // Populate batches dropdown
  let batchselect = findtag("taskbatchselect")
  batchselect.innerHTML = ""
  let batches = getdistinctbatches()

  if (batches.length === 0) {
    let opt = document.createElement("option")
    opt.value = batchname || "General Batch"
    opt.innerText = batchname || "General Batch"
    batchselect.appendChild(opt)
  } else {
    for (let b of batches) {
      let opt = document.createElement("option")
      opt.value = b.batch
      opt.innerText = b.batch + " (" + b.studentcount + " students)"
      batchselect.appendChild(opt)
    }
  }

  if (batchname) {
    batchselect.value = batchname
  }

  ontaskbatchchanged()

  if (studentname) {
    findtag("taskstudentselect").value = studentname
  }

  settasktarget(targetType || "batch")

  findtag("tasktitleinput").value = ""
  findtag("taskdescinput").value = ""
  findtag("taskduedateinput").value = ""
  findtag("taskmodalstatus").innerText = ""

  findtag("taskassignmodal").classList.remove("hidden")
}

function closetaskmodal() {
  findtag("taskassignmodal").classList.add("hidden")
}

async function submittaskassignment() {
  let targettype = currenttasktarget
  let targetbatch = findtag("taskbatchselect").value.trim()
  let targetstudent = targettype === "student" ? findtag("taskstudentselect").value.trim() : ""
  let tasktitle = findtag("tasktitleinput").value.trim()
  let taskdesc = findtag("taskdescinput").value.trim()
  let duedate = findtag("taskduedateinput").value.trim()
  let statusmsg = findtag("taskmodalstatus")
  let submitbtn = findtag("submittaskbtn")

  if (!targetbatch) {
    statusmsg.innerText = "Please select a target batch."
    return
  }

  if (targettype === "student" && !targetstudent) {
    statusmsg.innerText = "Please select a target student."
    return
  }

  if (!tasktitle) {
    statusmsg.innerText = "Please enter a task title."
    return
  }

  statusmsg.innerText = "Assigning task..."
  submitbtn.disabled = true

  try {
    let res = await fetch(workerurl + "/api/assignbatchtask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        teachername: activeteacher.name,
        teachersubject: activeteacher.subject,
        teacherpin: activeteacher.pin,
        targettype,
        targetbatch,
        targetstudent,
        tasktitle,
        taskdesc,
        duedate
      })
    })

    let resjson = await res.json()
    submitbtn.disabled = false

    if (resjson.success) {
      statusmsg.innerText = "Task assigned successfully!"
      if (resjson.task) {
        alltasks.unshift(resjson.task)
      }
      setTimeout(() => {
        closetaskmodal()
      }, 1200)
    } else {
      statusmsg.innerText = resjson.error || "Failed to assign task."
    }
  } catch (err) {
    submitbtn.disabled = false
    statusmsg.innerText = "Connection error while assigning task."
  }
}

// -----------------------------------------------------------------------------
// View Assigned Tasks Modal & Task Deletion
// -----------------------------------------------------------------------------
function opentaskslistmodal() {
  let modal = findtag("tasksviewmodal")
  modal.classList.remove("hidden")
  rendertasksmodalcontent()
}

function closetaskslistmodal() {
  findtag("tasksviewmodal").classList.add("hidden")
}

function rendertasksmodalcontent() {
  let listcontainer = findtag("tasksmodallist")
  let countbadge = findtag("tasksmodalcount")

  countbadge.innerText = alltasks.length + (alltasks.length === 1 ? " task" : " tasks")

  if (alltasks.length === 0) {
    listcontainer.innerHTML = "<div class='subtext' style='padding:20px 0;text-align:center'>No tasks assigned yet. Click 'Assign Task' to assign tasks.</div>"
    return
  }

  let html = ""
  for (let t of alltasks) {
    let targetlabel = t.targettype === "student"
      ? "Student: " + (t.targetstudent || "Individual") + " (" + t.targetbatch + ")"
      : "Entire Batch: " + t.targetbatch

    let duebadge = t.duedate ? "<span class='taskduebadge'>Due: " + t.duedate + "</span>" : ""
    let authorbadge = "<span class='taskauthorbadge'>Teacher: " + (t.teachername || "Teacher") + (t.teachersubject ? " (" + t.teachersubject + ")" : "") + "</span>"

    html += `
      <div class="taskcard">
        <div class="taskcardheader">
          <h4 class="tasktitle">${t.tasktitle}</h4>
          <button type="button" class="delbtn" onclick="deletetaskitem(${t.id})">Delete</button>
        </div>
        <div class="taskbadges">
          <span class="tasktargetbadge">${targetlabel}</span>
          ${duebadge}
          ${authorbadge}
        </div>
        ${t.taskdesc ? `<div class="taskdesc">${t.taskdesc}</div>` : ""}
      </div>
    `
  }

  listcontainer.innerHTML = html
}

async function deletetaskitem(taskId) {
  let confirmed = confirm("Are you sure you want to delete this assigned task?")
  if (!confirmed) return

  try {
    let res = await fetch(workerurl + "/api/deletetask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: taskId })
    })
    let resjson = await res.json()
    if (resjson.success) {
      alltasks = alltasks.filter(t => t.id !== taskId)
      rendertasksmodalcontent()
    } else {
      alert(resjson.error || "Failed to delete task.")
    }
  } catch (err) {
    alert("Connection error while deleting task.")
  }
}

// -----------------------------------------------------------------------------
// Student Account Deletion & Thor Ban Hammer GIF
// -----------------------------------------------------------------------------
async function deletestudent(ev, stunameEnc, stubatchEnc) {
  if (ev) {
    ev.stopPropagation()
  }

  let stuname = decodeURIComponent(stunameEnc)
  let stubatch = decodeURIComponent(stubatchEnc)

  let confirmed = confirm("Are you sure you want to delete student account for \"" + stuname + "\" (" + stubatch + ")?\n\nThis will permanently delete the student account and all of their progress records.")
  if (!confirmed) return

  let teacherpin = (activeteacher && activeteacher.pin) || ""
  let teachername = (activeteacher && activeteacher.name) || ""

  if (!teacherpin) {
    teacherpin = prompt("Please enter the teacher pin or admin password to confirm deletion:")
    if (!teacherpin) return
  }

  try {
    let delres = await fetch(workerurl + "/api/deletestudent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        teachername: teachername,
        teacherpin: teacherpin,
        adminpassword: verifiedadminsecret || teacherpin,
        studentname: stuname,
        studentbatch: stubatch
      })
    })

    let resdata = await delres.json()
    if (resdata.success) {
      allaccounts = allaccounts.filter(a => !(a.studentname === stuname && a.studentbatch === stubatch))
      allentries = allentries.filter(r => !(r.studentname === stuname && r.studentbatch === stubatch))

      if (chosenstudent === stuname && chosenbatch === stubatch) {
        backtobatchstudents()
      } else {
        renderbatchstudentsview()
      }

      // Show Thor ban GIF for 4 seconds
      await showbangif()
    } else {
      if (resdata.error === "endpoint not found") {
        alert("The backend worker does not have the /api/deletestudent endpoint enabled yet.")
      } else {
        alert(resdata.error || "Failed to delete student account.")
      }
    }
  } catch (err) {
    alert("Error connecting to server while deleting student.")
  }
}

function deleteselectedstudent() {
  if (!chosenstudent || !chosenbatch) return
  deletestudent(null, encodeURIComponent(chosenstudent), encodeURIComponent(chosenbatch))
}

function showbangif() {
  return new Promise(resolve => {
    let overlay = findtag("banoverlay")
    let gifimg = findtag("bangifimg")

    if (!overlay) {
      setTimeout(resolve, 4000)
      return
    }

    if (gifimg) {
      // Force GIF animation to play from start with fresh timestamp
      gifimg.src = banhammerurl + "?t=" + Date.now()
    }

    overlay.classList.remove("hidden")
    void overlay.offsetWidth
    overlay.classList.add("active")

    setTimeout(() => {
      overlay.classList.remove("active")
      setTimeout(() => {
        overlay.classList.add("hidden")
        resolve()
      }, 200)
    }, 4000)
  })
}
