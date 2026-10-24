const workerbase = "https://peedabloo.desaipahal64.workers.dev"

let authmode = "login"
let activestudent = null
let recordsdata = []
let activesubject = ""
let activechapter = ""

function getnode(tagid) {
  return document.getElementById(tagid)
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

      getnode("profilenamedisplay").innerText = activestudent.name
      getnode("profilebatchdisplay").innerText = "(" + activestudent.batch + ")"
      getnode("authview").classList.add("hidden")
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
  activesubject = ""
  activechapter = ""
  getnode("pupilpin").value = ""
  getnode("subjectsview").classList.add("hidden")
  getnode("chaptersview").classList.add("hidden")
  getnode("progressview").classList.add("hidden")
  getnode("authview").classList.remove("hidden")
}

async function syncstudentdata() {
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

  filtersubjects()
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
    cardshtml += "<div><div class='cardtitle'>" + eachsub + "</div><div class='cardmeta'>click to view chapters</div></div>"
    cardshtml += "<span class='badge'>" + countlabel + " &rarr;</span>"
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
    cardshtml += "<div><div class='cardtitle'>" + eachchap + "</div><div class='cardmeta'>" + dpphint + "</div></div>"
    cardshtml += "<span class='badge'>view / edit &rarr;</span>"
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
  getnode("progressstatus").innerText = ""
}

async function savechapterprogress() {
  let dppbox = getnode("dppinput").value.trim()
  let prabalbox = getnode("prabalinput").value.trim()
  let parikshitbox = getnode("parikshitinput").value.trim()
  let pyqbox = getnode("pyqinput").value.trim()
  let savemsg = getnode("progressstatus")

  savemsg.innerText = "syncing..."

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
        pyqsprogress: pyqbox
      })
    })
    let resdata = await saveres.json()
    if (resdata.success) {
      savemsg.innerText = "progress synced with database!"
      await syncstudentdata()
    } else {
      savemsg.innerText = resdata.error || "failed to save"
    }
  } catch (err) {
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
