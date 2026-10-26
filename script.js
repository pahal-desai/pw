const workerbase = "https://peedabloo.desaipahal64.workers.dev"

let authmode = "login"
let activestudent = null
let recordsdata = []
let studenttasks = []
let studentsubmissions = []
let activesubject = ""
let activechapter = ""
let activetaskid = null
let tasksubmissionphotos = []

let currentphotos = {
  dpp: [],
  prabal: [],
  parikshit: [],
  pyqs: []
}

function getnode(tagid) {
  return document.getElementById(tagid)
}

function parsephotolist(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw !== "string") return []
  let trimmed = raw.trim()
  if (!trimmed) return []
  if (trimmed.startsWith("[")) {
    try {
      let parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch (e) { }
  }
  return [trimmed]
}

function switchauthmode(targetmode) {
  authmode = targetmode
  let loginbtn = getnode("tabloginbtn")
  let signupbtn = getnode("tabsignupbtn")
  let headingnode = getnode("authheading")
  let subtextnode = getnode("authsubtext")
  let pinlabelnode = getnode("pinlabel")
  let submitbtn = getnode("authsubmitbtn")
  let switchbox = getnode("authswitchbox")
  let noticemsg = getnode("authstatus")

  noticemsg.innerText = ""

  if (authmode === "login") {
    loginbtn.classList.add("authtabactive")
    signupbtn.classList.remove("authtabactive")
    headingnode.innerText = "student login"
    subtextnode.innerText = "enter your name, batch, and pin to log in to your account."
    pinlabelnode.innerText = "secret pin"
    submitbtn.innerText = "log in"
    switchbox.innerHTML = "don't have an account? <a href='javascript:void(0)' onclick='switchauthmode(\"signup\")' class='navlink'>sign up here</a>"
  } else {
    signupbtn.classList.add("authtabactive")
    loginbtn.classList.remove("authtabactive")
    headingnode.innerText = "create student account"
    subtextnode.innerText = "choose a name, batch, and pin to create your personal progress tracker."
    pinlabelnode.innerText = "create a secret pin"
    submitbtn.innerText = "create account"
    switchbox.innerHTML = "already have an account? <a href='javascript:void(0)' onclick='switchauthmode(\"login\")' class='navlink'>log in here</a>"
  }
}

async function handleauthsubmit() {
  let nameinput = getnode("pupilname").value.trim()
  let batchinput = getnode("pupilbatch").value.trim()
  let pininput = getnode("pupilpin").value.trim()
  let noticemsg = getnode("authstatus")

  if (!nameinput || !batchinput || !pininput) {
    noticemsg.innerText = "please fill name, batch, and pin"
    return
  }

  if (authmode === "signup") {
    noticemsg.innerText = "creating account..."
    try {
      let signupres = await fetch(workerbase + "/api/studentsignup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentname: nameinput,
          studentbatch: batchinput,
          studentpin: pininput
        })
      })
      let signuptxt = await signupres.json()
      if (!signuptxt.success) {
        noticemsg.innerText = signuptxt.error || "failed to create account"
        return
      }

      noticemsg.innerText = "account created! signing you in..."
    } catch (err) {
      noticemsg.innerText = "error connecting to server"
      return
    }
  } else {
    noticemsg.innerText = "verifying login..."
  }

  try {
    let loginres = await fetch(workerbase + "/api/studentlogin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentname: nameinput,
        studentbatch: batchinput,
        studentpin: pininput
      })
    })
    let logintxt = await loginres.json()
    if (logintxt.success) {
      noticemsg.innerText = ""
      activestudent = {
        name: nameinput,
        batch: batchinput,
        pin: pininput
      }
      recordsdata = logintxt.records || []
      studenttasks = logintxt.tasks || []
      studentsubmissions = logintxt.submissions || []

      getnode("profilenamedisplay").innerText = activestudent.name
      getnode("profilebatchdisplay").innerText = "(" + activestudent.batch + ")"
      getnode("authview").classList.add("hidden")
      renderstudenttasks()
      showsubjectspage()
    } else {
      noticemsg.innerText = logintxt.error || "login failed"
    }
  } catch (err) {
    noticemsg.innerText = "connection error during login"
  }
}

function dologout() {
  activestudent = null
  recordsdata = []
  studenttasks = []
  studentsubmissions = []
  activesubject = ""
  activechapter = ""
  activetaskid = null
  tasksubmissionphotos = []
  currentphotos = { dpp: [], prabal: [], parikshit: [], pyqs: [] }
  getnode("pupilpin").value = ""
  renderstudenttasks()
  getnode("subjectsview").classList.add("hidden")
  getnode("chaptersview").classList.add("hidden")
  getnode("progressview").classList.add("hidden")
  getnode("authview").classList.remove("hidden")
}

async function syncstudentdata() {
  if (!activestudent) return false
  try {
    let fetchres = await fetch(workerbase + "/api/getstudent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentname: activestudent.name,
        studentbatch: activestudent.batch,
        studentpin: activestudent.pin
      })
    })
    let jsonres = await fetchres.json()
    if (jsonres.success) {
      recordsdata = jsonres.records || []
      studenttasks = jsonres.tasks || []
      studentsubmissions = jsonres.submissions || []
      renderstudenttasks()
      return true
    }
    return false
  } catch (err) {
    return false
  }
}

function showsubjectspage() {
  getnode("chaptersview").classList.add("hidden")
  getnode("progressview").classList.add("hidden")
  getnode("subjectsview").classList.remove("hidden")
  getnode("newsubjectform").classList.add("hidden")
  getnode("subjectsearch").value = ""

  renderstudenttasks()
  filtersubjects()
}

function renderstudenttasks() {
  let tasksbox = getnode("studenttasksbox")
  let taskslistnode = getnode("studenttaskslist")
  let countlabel = getnode("studenttaskcount")

  if (!tasksbox || !taskslistnode) return

  if (!studenttasks || studenttasks.length === 0) {
    tasksbox.classList.add("hidden")
    return
  }

  tasksbox.classList.remove("hidden")
  countlabel.innerText = studenttasks.length + (studenttasks.length === 1 ? " task" : " tasks")

  let html = ""
  for (let t of studenttasks) {
    let targetlabel = t.targettype === "student"
      ? "Assigned to you personally"
      : "Assigned to your batch (" + t.targetbatch + ")"

    let duebadge = t.duedate ? "<span class='taskduebadge'>Due: " + t.duedate + "</span>" : ""
    let authorbadge = "<span class='taskauthorbadge'>Teacher: " + (t.teachername || "Teacher") + (t.teachersubject ? " (" + t.teachersubject + ")" : "") + "</span>"

    let submission = (studentsubmissions || []).find(s => String(s.taskid) === String(t.id))
    let subStatusBadge = ""
    let submissionPhotosHtml = ""
    let subActionBtn = ""

    if (submission) {
      let subPhotos = parsephotolist(submission.submissionphotos)
      subStatusBadge = `<span class='taskstatusbadge taskstatus-done'>Submitted (${subPhotos.length} photos)</span>`
      subActionBtn = `<button type="button" class="actionpillbtn actionpillbtn-secondary" onclick="opensubmittaskmodal(${t.id})">Update Submission</button>`

      let timeFormatted = submission.submittedat ? new Date(submission.submittedat).toLocaleDateString() : ""
      let commentHtml = submission.submissioncomment ? `<div class="submissioncomment" style="margin-top:6px">Note: ${submission.submissioncomment}</div>` : ""

      let thumbsHtml = ""
      if (subPhotos.length > 0) {
        thumbsHtml = "<div class='photogallery' style='margin-top:6px'>" + subPhotos.map((src, idx) => `
          <div class="photothumbwrap">
            <img src="${src}" alt="Proof ${idx + 1}" onclick="openphotolightbox(this.src)">
          </div>
        `).join("") + "</div>"
      }

      submissionPhotosHtml = `
        <div class="submissiondetails">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">
            <span style="font-size:12px;color:#3fb950;font-weight:600">Your Submission</span>
            ${timeFormatted ? `<span class="submissiontime">${timeFormatted}</span>` : ""}
          </div>
          ${commentHtml}
          ${thumbsHtml}
        </div>
      `
    } else {
      subStatusBadge = `<span class='taskstatusbadge taskstatus-pending'>Pending Submission</span>`
      subActionBtn = `<button type="button" class="savebtn" style="padding:6px 14px;font-size:13px" onclick="opensubmittaskmodal(${t.id})">Submit Task Proof</button>`
    }

    html += `
      <div class="taskcard">
        <div class="taskcardheader">
          <h4 class="tasktitle">${t.tasktitle}</h4>
          ${subActionBtn}
        </div>
        <div class="taskbadges">
          <span class="tasktargetbadge">${targetlabel}</span>
          ${duebadge}
          ${authorbadge}
          ${subStatusBadge}
        </div>
        ${t.taskdesc ? `<div class="taskdesc">${t.taskdesc}</div>` : ""}
        ${submissionPhotosHtml}
      </div>
    `
  }
  taskslistnode.innerHTML = html
}

function opensubmittaskmodal(taskId) {
  let task = studenttasks.find(t => String(t.id) === String(taskId))
  if (!task) return

  activetaskid = taskId
  let modal = getnode("submittaskmodal")
  let titleNode = getnode("submittaskmodaltitle")
  let infoBox = getnode("submittaskinfobox")
  let commentInput = getnode("tasksubmissioncommentinput")
  let statusNode = getnode("submittaskstatus")

  titleNode.innerText = "Submit Task: " + task.tasktitle
  infoBox.innerHTML = `
    <div class="taskinfotitle">${task.tasktitle}</div>
    ${task.taskdesc ? `<div class="taskdesc" style="margin-bottom:6px">${task.taskdesc}</div>` : ""}
    <div style="font-size:12px;color:#888888">
      Teacher: ${task.teachername || "Teacher"}${task.teachersubject ? " (" + task.teachersubject + ")" : ""}
      ${task.duedate ? " • Due: " + task.duedate : ""}
    </div>
  `

  let existingSub = (studentsubmissions || []).find(s => String(s.taskid) === String(taskId))
  if (existingSub) {
    tasksubmissionphotos = parsephotolist(existingSub.submissionphotos)
    commentInput.value = existingSub.submissioncomment || ""
  } else {
    tasksubmissionphotos = []
    commentInput.value = ""
  }

  statusNode.innerText = ""
  updatetasksubmissiongallery()
  modal.classList.remove("hidden")
}

function closesubmittaskmodal() {
  let modal = getnode("submittaskmodal")
  if (modal) modal.classList.add("hidden")
  activetaskid = null
  tasksubmissionphotos = []
}

function triggertaskphotoupload() {
  let input = getnode("tasksubmissionfileinput")
  if (input) input.click()
}

async function handletaskphotosupload(files) {
  if (!files || files.length === 0) return
  let fileList = Array.from(files).filter(f => f.type && f.type.startsWith("image/"))
  if (fileList.length === 0) {
    alert("Please select valid image files.")
    return
  }

  let statusNode = getnode("submittaskstatus")
  statusNode.style.color = "#58a6ff"
  statusNode.innerText = "Processing " + fileList.length + " image(s)..."

  try {
    for (let f of fileList) {
      let dataUrl = await compressimage(f, 1200, 0.75)
      tasksubmissionphotos.push(dataUrl)
    }
    statusNode.innerText = ""
    updatetasksubmissiongallery()
  } catch (err) {
    alert("Error processing images: " + err.message)
    statusNode.innerText = ""
  }

  let input = getnode("tasksubmissionfileinput")
  if (input) input.value = ""
}

function removetasksubmissionphoto(index) {
  if (tasksubmissionphotos && tasksubmissionphotos.length > index) {
    tasksubmissionphotos.splice(index, 1)
    updatetasksubmissiongallery()
  }
}

function updatetasksubmissiongallery() {
  let gallery = getnode("tasksubmissiongallery")
  let uploadbtn = getnode("taskuploadbtn")
  if (!gallery) return

  if (uploadbtn) {
    uploadbtn.innerText = tasksubmissionphotos.length > 0 ? "+ Add More Photos" : "+ Upload Photos (Select Multiple)"
  }

  if (tasksubmissionphotos.length === 0) {
    gallery.innerHTML = "<div class='subtext' style='margin-top:6px'>No photos attached yet. Attach at least one photo.</div>"
    return
  }

  let html = ""
  tasksubmissionphotos.forEach((src, idx) => {
    html += `
      <div class="photothumbwrap">
        <img src="${src}" alt="Submission photo ${idx + 1}" onclick="openphotolightbox(this.src)">
        <button type="button" class="thumbdelbtn" onclick="removetasksubmissionphoto(${idx})" title="Remove photo">&times;</button>
      </div>
    `
  })
  gallery.innerHTML = html
}

async function submittaskproof() {
  if (!activetaskid) return

  let statusNode = getnode("submittaskstatus")
  let submitBtn = getnode("submittaskbtn")
  let commentInput = getnode("tasksubmissioncommentinput")

  if (tasksubmissionphotos.length === 0) {
    statusNode.style.color = "#ff6b6b"
    statusNode.innerText = "Please attach at least one photo of your work before submitting."
    alert("Please attach at least one photo proof for this task.")
    return
  }

  statusNode.style.color = "#58a6ff"
  statusNode.innerText = "Submitting task proof..."
  submitBtn.disabled = true

  try {
    let res = await fetch(workerbase + "/api/submittask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        taskid: activetaskid,
        studentname: activestudent.name,
        studentbatch: activestudent.batch,
        studentpin: activestudent.pin,
        photos: tasksubmissionphotos,
        comment: commentInput.value.trim()
      })
    })

    let resJson = await res.json()
    submitBtn.disabled = false

    if (resJson.success) {
      statusNode.style.color = "#3fb950"
      statusNode.innerText = "Task proof submitted successfully!"

      if (resJson.submission) {
        let existingIdx = studentsubmissions.findIndex(s => String(s.taskid) === String(activetaskid))
        if (existingIdx >= 0) {
          studentsubmissions[existingIdx] = resJson.submission
        } else {
          studentsubmissions.unshift(resJson.submission)
        }
      }

      renderstudenttasks()
      setTimeout(() => {
        closesubmittaskmodal()
      }, 1000)
    } else {
      statusNode.style.color = "#ff6b6b"
      statusNode.innerText = resJson.error || "Failed to submit task proof."
    }
  } catch (err) {
    submitBtn.disabled = false
    statusNode.style.color = "#ff6b6b"
    statusNode.innerText = "Connection error while submitting task."
  }
}

function filtersubjects() {
  let filtertext = getnode("subjectsearch").value.toLowerCase().trim()
  let subjectlist = []
  for (let row of recordsdata) {
    if (row.subjectname && !subjectlist.includes(row.subjectname)) {
      subjectlist.push(row.subjectname)
    }
  }

  let emptynode = getnode("emptysubjectbox")
  let activenode = getnode("activesubjectbox")
  let cardsnode = getnode("subjectcards")

  if (subjectlist.length === 0) {
    emptynode.classList.remove("hidden")
    activenode.classList.add("hidden")
    return
  }

  emptynode.classList.add("hidden")
  activenode.classList.remove("hidden")

  let filteredsubjects = subjectlist.filter(item => item.toLowerCase().includes(filtertext))

  if (filteredsubjects.length === 0) {
    cardsnode.innerHTML = "<div class='subtext' style='padding:10px 0'>no matching subjects found</div>"
    return
  }

  let cardshtml = ""
  for (let eachsub of filteredsubjects) {
    let chapcount = recordsdata.filter(entry => entry.subjectname === eachsub && entry.chaptername && entry.chaptername.trim() !== "").length
    let countlabel = chapcount === 1 ? "1 chapter" : chapcount + " chapters"
    cardshtml += "<div class='cardbtn' onclick='showchapterspage(\"" + eachsub + "\")'>"
    cardshtml += "<div class='cardinfo'><div class='cardtitle'>" + eachsub + "</div><div class='cardmeta'>click to view chapters</div></div>"
    cardshtml += "<span class='badge cardbadge'>" + countlabel + " &rarr;</span>"
    cardshtml += "</div>"
  }
  cardsnode.innerHTML = cardshtml
}

function opensubjectinput() {
  getnode("newsubjectform").classList.remove("hidden")
  getnode("newsubjectname").focus()
}

function cancelsubjectinput() {
  getnode("newsubjectform").classList.add("hidden")
  getnode("newsubjectname").value = ""
}

async function addnewsubject() {
  let inputbox = getnode("newsubjectname")
  let newsubval = inputbox.value.trim()
  if (!newsubval) return

  try {
    let postres = await fetch(workerbase + "/api/addsubject", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentname: activestudent.name,
        studentbatch: activestudent.batch,
        studentpin: activestudent.pin,
        subjectname: newsubval
      })
    })
    let resdata = await postres.json()
    if (resdata.success) {
      cancelsubjectinput()
      await syncstudentdata()
      showsubjectspage()
    }
  } catch (err) {
    alert("error adding subject")
  }
}

function showchapterspage(subname) {
  activesubject = subname
  getnode("subjectsview").classList.add("hidden")
  getnode("progressview").classList.add("hidden")
  getnode("chaptersview").classList.remove("hidden")
  getnode("newchapterform").classList.add("hidden")
  getnode("currentsubjecttitle").innerText = activesubject
  getnode("chaptersearch").value = ""

  filterchapters()
}

function filterchapters() {
  let filtertext = getnode("chaptersearch").value.toLowerCase().trim()
  let chapterlist = []
  for (let item of recordsdata) {
    if (item.subjectname === activesubject && item.chaptername && item.chaptername.trim() !== "" && !chapterlist.includes(item.chaptername)) {
      chapterlist.push(item.chaptername)
    }
  }

  let emptychap = getnode("emptychapterbox")
  let activechap = getnode("activechapterbox")
  let cardsnode = getnode("chaptercards")

  if (chapterlist.length === 0) {
    emptychap.classList.remove("hidden")
    activechap.classList.add("hidden")
    return
  }

  emptychap.classList.add("hidden")
  activechap.classList.remove("hidden")

  let filteredchapters = chapterlist.filter(c => c.toLowerCase().includes(filtertext))

  if (filteredchapters.length === 0) {
    cardsnode.innerHTML = "<div class='subtext' style='padding:10px 0'>no matching chapters found</div>"
    return
  }

  let cardshtml = ""
  for (let eachchap of filteredchapters) {
    let targetrow = recordsdata.find(entry => entry.subjectname === activesubject && entry.chaptername === eachchap)
    let dpphint = targetrow && targetrow.dppprogress ? "DPP: " + targetrow.dppprogress : "progress not set"

    cardshtml += "<div class='cardbtn' onclick='showprogresspage(\"" + eachchap + "\")'>"
    cardshtml += "<div class='cardinfo'><div class='cardtitle'>" + eachchap + "</div><div class='cardmeta'>" + dpphint + "</div></div>"
    cardshtml += "<span class='badge cardbadge'>view / edit &rarr;</span>"
    cardshtml += "</div>"
  }
  cardsnode.innerHTML = cardshtml
}

function openchapterinput() {
  getnode("newchapterform").classList.remove("hidden")
  getnode("newchaptername").focus()
}

function cancelchapterinput() {
  getnode("newchapterform").classList.add("hidden")
  getnode("newchaptername").value = ""
}

async function addnewchapter() {
  let chapinput = getnode("newchaptername")
  let newchapval = chapinput.value.trim()
  if (!newchapval) return

  try {
    let postres = await fetch(workerbase + "/api/savechapter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentname: activestudent.name,
        studentbatch: activestudent.batch,
        studentpin: activestudent.pin,
        subjectname: activesubject,
        chaptername: newchapval,
        dppprogress: "",
        prabalprogress: "",
        parikshitprogress: "",
        pyqsprogress: ""
      })
    })
    let resdata = await postres.json()
    if (resdata.success) {
      cancelchapterinput()
      await syncstudentdata()
      showprogresspage(newchapval)
    }
  } catch (err) {
    alert("error adding chapter")
  }
}

function showprogresspage(chapname) {
  activechapter = chapname
  getnode("subjectsview").classList.add("hidden")
  getnode("chaptersview").classList.add("hidden")
  getnode("progressview").classList.remove("hidden")

  getnode("progresstopiclabel").innerText = activesubject + " > " + activechapter
  getnode("progresschaptertitle").innerText = activechapter

  let targetrow = recordsdata.find(entry => entry.subjectname === activesubject && entry.chaptername === activechapter)

  getnode("dppinput").value = (targetrow && targetrow.dppprogress) || ""
  getnode("prabalinput").value = (targetrow && targetrow.prabalprogress) || ""
  getnode("parikshitinput").value = (targetrow && targetrow.parikshitprogress) || ""
  getnode("pyqinput").value = (targetrow && targetrow.pyqsprogress) || ""

  let savemsg = getnode("progressstatus")
  savemsg.style.color = "#58a6ff"
  savemsg.innerText = ""

  // Load photos from target row (support multiple photos)
  currentphotos.dpp = parsephotolist(targetrow && targetrow.dppphoto)
  currentphotos.prabal = parsephotolist(targetrow && targetrow.prabalphoto)
  currentphotos.parikshit = parsephotolist(targetrow && targetrow.parikshitphoto)
  currentphotos.pyqs = parsephotolist(targetrow && targetrow.pyqsphoto)

  for (let key of ["dpp", "prabal", "parikshit", "pyqs"]) {
    updatephotoui(key)
    let grp = getnode(key + "group")
    if (grp) grp.classList.remove("photomissing")
  }
}

function triggerphotoupload(key) {
  let fileinput = getnode(key + "fileinput")
  if (fileinput) {
    fileinput.click()
  }
}

async function handlephotoupload(key, files) {
  if (!files || files.length === 0) return
  let fileList = Array.from(files).filter(f => f.type && f.type.startsWith("image/"))
  if (fileList.length === 0) {
    alert("Please select valid image files.")
    return
  }

  let savemsg = getnode("progressstatus")
  savemsg.style.color = "#58a6ff"
  savemsg.innerText = "Processing " + fileList.length + " image(s)..."

  try {
    for (let f of fileList) {
      let dataUrl = await compressimage(f, 1200, 0.75)
      currentphotos[key].push(dataUrl)
    }
    updatephotoui(key)
    let grp = getnode(key + "group")
    if (grp) grp.classList.remove("photomissing")
    savemsg.innerText = ""
  } catch (err) {
    alert("Error processing images: " + err.message)
    savemsg.innerText = ""
  }

  let fileinput = getnode(key + "fileinput")
  if (fileinput) fileinput.value = ""
}

function removephoto(key, index) {
  if (currentphotos[key] && currentphotos[key].length > index) {
    currentphotos[key].splice(index, 1)
    updatephotoui(key)
  }
}

function updatephotoui(key) {
  let photos = currentphotos[key] || []
  let hasPhotos = photos.length > 0
  let gallery = getnode(key + "gallery")
  let uploadbtn = getnode(key + "uploadbtn")
  let badge = getnode(key + "photobadge")

  if (badge) {
    if (hasPhotos) {
      badge.innerText = photos.length + (photos.length === 1 ? " photo attached" : " photos attached")
      badge.className = "photostatusbadge badge-success"
    } else {
      badge.innerText = "Photos required *"
      badge.className = "photostatusbadge badge-required"
    }
  }

  if (uploadbtn) {
    uploadbtn.innerText = hasPhotos ? "+ Add More Photos" : "Attach " + key.toUpperCase() + " Photos (Required)"
  }

  if (gallery) {
    if (!hasPhotos) {
      gallery.innerHTML = ""
      return
    }
    let html = ""
    photos.forEach((src, idx) => {
      html += `
        <div class="photothumbwrap">
          <img src="${src}" alt="${key} photo ${idx + 1}" onclick="openphotolightbox(this.src)">
          <button type="button" class="thumbdelbtn" onclick="removephoto('${key}', ${idx})" title="Remove photo">&times;</button>
        </div>
      `
    })
    gallery.innerHTML = html
  }
}

function compressimage(file, maxDimension = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader()
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.onload = (e) => {
      let img = new Image()
      img.onerror = () => reject(new Error("Failed to load image"))
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        let canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        let ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0, width, height)

        let dataUrl = canvas.toDataURL("image/jpeg", quality)
        resolve(dataUrl)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function openphotolightbox(src) {
  let lightbox = getnode("photolightbox")
  let lightboximg = getnode("lightboximg")
  if (lightbox && lightboximg) {
    lightboximg.src = src
    lightbox.classList.remove("hidden")
  }
}

function closephotolightbox() {
  let lightbox = getnode("photolightbox")
  let lightboximg = getnode("lightboximg")
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
    closesubmittaskmodal()
  }
})

async function savechapterprogress() {
  let dppbox = getnode("dppinput").value.trim()
  let prabalbox = getnode("prabalinput").value.trim()
  let parikshitbox = getnode("parikshitinput").value.trim()
  let pyqbox = getnode("pyqinput").value.trim()
  let savemsg = getnode("progressstatus")

  // Strict Validation: Require at least one photo for all 4 sections
  let missing = []
  if (!currentphotos.dpp || currentphotos.dpp.length === 0) missing.push("DPP")
  if (!currentphotos.prabal || currentphotos.prabal.length === 0) missing.push("Prabal")
  if (!currentphotos.parikshit || currentphotos.parikshit.length === 0) missing.push("Parikshit")
  if (!currentphotos.pyqs || currentphotos.pyqs.length === 0) missing.push("PYQs")

  for (let key of ["dpp", "prabal", "parikshit", "pyqs"]) {
    let grp = getnode(key + "group")
    if (grp) {
      if (!currentphotos[key] || currentphotos[key].length === 0) {
        grp.classList.add("photomissing")
      } else {
        grp.classList.remove("photomissing")
      }
    }
  }

  if (missing.length > 0) {
    savemsg.style.color = "#ff6b6b"
    savemsg.innerText = "Cannot submit: Photos required for " + missing.join(", ") + "!"
    alert("Cannot submit without photos! Please attach photos for all 4 sections:\n• " + missing.join("\n• "))
    return
  }

  savemsg.style.color = "#58a6ff"
  savemsg.innerText = "syncing with database..."

  let targetrow = recordsdata.find(entry => entry.subjectname === activesubject && entry.chaptername === activechapter)

  try {
    let saveres = await fetch(workerbase + "/api/savechapter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: targetrow ? targetrow.id : null,
        studentname: activestudent.name,
        studentbatch: activestudent.batch,
        studentpin: activestudent.pin,
        subjectname: activesubject,
        chaptername: activechapter,
        dppprogress: dppbox,
        prabalprogress: prabalbox,
        parikshitprogress: parikshitbox,
        pyqsprogress: pyqbox,
        dppphoto: JSON.stringify(currentphotos.dpp),
        prabalphoto: JSON.stringify(currentphotos.prabal),
        parikshitphoto: JSON.stringify(currentphotos.parikshit),
        pyqsphoto: JSON.stringify(currentphotos.pyqs)
      })
    })
    let resdata = await saveres.json()
    if (resdata.success) {
      savemsg.style.color = "#3fb950"
      savemsg.innerText = "Progress and photos synced with database!"
      await syncstudentdata()
    } else {
      savemsg.style.color = "#ff6b6b"
      savemsg.innerText = resdata.error || "failed to save"
    }
  } catch (err) {
    savemsg.style.color = "#ff6b6b"
    savemsg.innerText = "error saving progress"
  }
}

async function wipecurrentchapter() {
  if (!confirm("delete chapter " + activechapter + "?")) return

  let targetrow = recordsdata.find(entry => entry.subjectname === activesubject && entry.chaptername === activechapter)
  if (!targetrow || !targetrow.id) return

  try {
    let delres = await fetch(workerbase + "/api/delchapter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: targetrow.id,
        studentpin: activestudent.pin
      })
    })
    let resdata = await delres.json()
    if (resdata.success) {
      activechapter = ""
      await syncstudentdata()
      showchapterspage(activesubject)
    }
  } catch (err) {
    alert("error deleting chapter")
  }
}

function backtosubjectsview() {
  showsubjectspage()
}

function backtochaptersview() {
  showchapterspage(activesubject)
}
