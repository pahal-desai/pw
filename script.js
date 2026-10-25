const workerbase = "https://peedabloo.desaipahal64.workers.dev"

let authmode = "login"
let activestudent = null
let recordsdata = []
let activesubject = ""
let activechapter = ""
let currentphotos = {
  dpp: "",
  prabal: "",
  parikshit: "",
  pyqs: ""
}

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
  currentphotos = { dpp: "", prabal: "", parikshit: "", pyqs: "" }
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

  // Load photos from target row
  currentphotos.dpp = (targetrow && targetrow.dppphoto) || ""
  currentphotos.prabal = (targetrow && targetrow.prabalphoto) || ""
  currentphotos.parikshit = (targetrow && targetrow.parikshitphoto) || ""
  currentphotos.pyqs = (targetrow && targetrow.pyqsphoto) || ""

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

async function handlephotoupload(key, file) {
  if (!file) return
  if (!file.type || !file.type.startsWith("image/")) {
    alert("Please select a valid image file.")
    return
  }

  let savemsg = getnode("progressstatus")
  savemsg.style.color = "#58a6ff"
  savemsg.innerText = "Processing image..."

  try {
    let dataUrl = await compressimage(file, 1200, 0.75)
    currentphotos[key] = dataUrl
    updatephotoui(key)
    let grp = getnode(key + "group")
    if (grp) grp.classList.remove("photomissing")
    savemsg.innerText = ""
  } catch (err) {
    alert("Error processing image: " + err.message)
    savemsg.innerText = ""
  }
}

function removephoto(key) {
  currentphotos[key] = ""
  let fileinput = getnode(key + "fileinput")
  if (fileinput) fileinput.value = ""
  updatephotoui(key)
}

function updatephotoui(key) {
  let hasPhoto = !!currentphotos[key]
  let previewbox = getnode(key + "previewbox")
  let uploadbtnbox = getnode(key + "uploadbtnbox")
  let previewimg = getnode(key + "previewimg")
  let badge = getnode(key + "photobadge")

  if (hasPhoto) {
    if (previewimg) previewimg.src = currentphotos[key]
    if (previewbox) previewbox.classList.remove("hidden")
    if (uploadbtnbox) uploadbtnbox.classList.add("hidden")
    if (badge) {
      badge.innerText = "✓ Photo added"
      badge.className = "photostatusbadge badge-success"
    }
  } else {
    if (previewimg) previewimg.src = ""
    if (previewbox) previewbox.classList.add("hidden")
    if (uploadbtnbox) uploadbtnbox.classList.remove("hidden")
    if (badge) {
      badge.innerText = "Photo required *"
      badge.className = "photostatusbadge badge-required"
    }
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
  }
})

async function savechapterprogress() {
  let dppbox = getnode("dppinput").value.trim()
  let prabalbox = getnode("prabalinput").value.trim()
  let parikshitbox = getnode("parikshitinput").value.trim()
  let pyqbox = getnode("pyqinput").value.trim()
  let savemsg = getnode("progressstatus")

  // Strict Validation: Require all 4 photos before submission
  let missing = []
  if (!currentphotos.dpp) missing.push("DPP")
  if (!currentphotos.prabal) missing.push("Prabal")
  if (!currentphotos.parikshit) missing.push("Parikshit")
  if (!currentphotos.pyqs) missing.push("PYQs")

  for (let key of ["dpp", "prabal", "parikshit", "pyqs"]) {
    let grp = getnode(key + "group")
    if (grp) {
      if (!currentphotos[key]) {
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
        dppphoto: currentphotos.dpp,
        prabalphoto: currentphotos.prabal,
        parikshitphoto: currentphotos.parikshit,
        pyqsphoto: currentphotos.pyqs
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
