/* ════════════════════════════════════════════════════
   pyq-database.js  —  NIT KKR PYQ Database
   Manages PYQ metadata in localStorage.
   Sample PDF (HTML, CSE Sem 2) is pre-seeded.
════════════════════════════════════════════════════ */

const PYQDatabase = (() => {

  const STORE_KEY = 'nitkkr_pyq_db';

  const SAMPLE_QUESTIONS = [
    {
      number: "Q.1",
      text: "What is HTML? Explain the basic structure of an HTML document with a suitable example. Differentiate between HTML and XHTML. Also explain tags: <head>, <body>, <title>, <h1> to <h6>, <p>, <br/>, <hr/>, <b>, <i>, <u>, <strong>, <em>.",
      marks: 15
    },
    {
      number: "Q.2",
      text: "Explain HTML Tables in detail. Write HTML code to create a 3x3 table with merged header row (colspan=3) containing 'Student Result'. Also explain HTML Forms and form elements: input types (text, password, radio, checkbox), select, option, textarea, and submit button.",
      marks: 15
    },
    {
      number: "Q.3",
      text: "Explain Hyperlinks in HTML. Differentiate between absolute and relative URLs. Write HTML demonstrating: link to external website in new tab, link using mailto, and anchor link to section within same page. Also explain the img tag with all attributes and image maps using map and area tags.",
      marks: 15
    },
    {
      number: "Q.4",
      text: "What are Semantic HTML5 elements? Explain header, footer, nav, main, aside, article, section, figure, figcaption with layout diagram. Write a complete HTML5 Student Registration Form with: Full Name, Roll Number, Branch dropdown (CSE/ECE/ME/EE/CE), Gender radio buttons, Subjects checkboxes, Date of Birth, Email, Password, and Submit button.",
      marks: 15
    },
    {
      number: "Q.5",
      text: "Explain inline CSS, internal CSS, and external CSS with examples. Which is preferred for large projects and why? Explain CSS selectors: element, class, id, attribute. Also explain HTML5 audio and video tags with attributes (src, controls, autoplay, loop, muted, poster), Canvas element, local storage vs session storage, and DOCTYPE declaration.",
      marks: 15
    }
  ];

  const SAMPLE_PDF_B64 = "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjIgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago0IDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGRPYmxpcXVlIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjQgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago2IDAgb2JqCjw8Ci9Db250ZW50cyAxMSAwIFIgL01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNyAwIG9iago8PAovQ29udGVudHMgMTIgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQgMTAgMCBSIC9SZXNvdXJjZXMgPDwKL0ZvbnQgMSAwIFIgL1Byb2NTZXQgWyAvUERGIC9UZXh0IC9JbWFnZUIgL0ltYWdlQyAvSW1hZ2VJIF0KPj4gL1JvdGF0ZSAwIC9UcmFucyA8PAoKPj4gCiAgL1R5cGUgL1BhZ2UKPj4KZW5kb2JqCjggMCBvYmoKPDwKL1BhZ2VNb2RlIC9Vc2VOb25lIC9QYWdlcyAxMCAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0F1dGhvciAoTklUIEt1cnVrc2hldHJhKSAvQ3JlYXRpb25EYXRlIChEOjIwMjYwMzA5MTIxMzA0KzAwJzAwJykgL0NyZWF0b3IgKFwodW5zcGVjaWZpZWRcKSkgL0tleXdvcmRzICgpIC9Nb2REYXRlIChEOjIwMjYwMzA5MTIxMzA0KzAwJzAwJykgL1Byb2R1Y2VyIChSZXBvcnRMYWIgUERGIExpYnJhcnkgLSBcKG9wZW5zb3VyY2VcKSkgCiAgL1N1YmplY3QgKENTRSBTZW1lc3RlciAyIC0gV2ViIERlc2lnbiBcKEhUTUxcKSBFbmQgU2VtZXN0ZXIgMjAyNCkgL1RpdGxlIChXZWIgRGVzaWduIC0gSFRNTCBQcmV2aW91cyBZZWFyIFF1ZXN0aW9uIFBhcGVyKSAvVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjEwIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNiAwIFIgNyAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDIwMDUKPj4Kc3RyZWFtCkdhdUhMPkJlT1UmOlgpT1ImPWY0VlxpJ21Eay0zODhrRWBgZE4wPEo9OlhGWVonRThjKW4mLCZKJW01Y0BNZTQ9bG8jJGQpSk5nVWMwMVg6JCltVkJgVydmXW5CLT1GUU5SUXRCKipgOCUlSjdSM18vKGc4QD9tPU1JQkdRSjgoQVhZbWhaSFRpYEhmNHFMaFVRRSZVUGRjaEEvLGBTNCkpRThub1RLci5kIypmdCZZKmMpYz1oKTk7P3VVSlw+aTRBL2huXHBQYUxRSVgzKCgzZiJEO3QhRmFKPVJwWkJwUl1fdWdMaVUsaURraE1mJkpGYU1HaHIuXj4jcy8jKzVDSlJYVXVjakE0Ij9kR2U1VTdUZnFrOmdfI2I8TjNpcF1uMmtAaERbN0dQMkxFYWthVCJtYzctTShLPDBRTVJSXEg3NTRANVJYJStdOk9uMkxdaUJEdCZzKU5NI1NBXGt0JTUlJzpOTlJoOSpKWVNwNGNYXkQ4VWdoM1YlLz4/NzREJztrLlVdTW1YVUpDV2FRNUk7LltjaDtXcCFTPCY3JEJrKUY9XTQ7QXIrLG0mNEVLNC1qJ2xWN1ZYV0dPMXUjXElvMF1bL3NGK1RdOWZKLTY0JUwuSGteKDgvTV9lb184RzNSSCRBayFubDQ/SjpULmhUYls/Rj09IjAzY2Zmb0NLLTwjJCEuWkZZTyZhZyZbN2AuQ0UwUyI5R18sVSdGNilbYi8vay1bK0ZwSlllLDlkZz5oTSRUVFcsdTlPQG45KStOP2BBRlRHVHBlImlFaE9LIVMsXEs7KUJaR3UxKztVZGRULlxLPT1zSjVgSEYsa3RmYDw7V1hlcFBGazFqZ0tDMiZgMydNPkJVUHRWJS1FZ2pQOGonYHQmP0QjPTYhNmhFZjE4ZVMmbjpjZFN0bDVdWW1scSFbTzJVKVY8VU9laDlpZTEncihncVEsZS84P0w/PStsNiYhSzdAT0I+LUkwWTFDIV1yMmNkKGY4USMwMHMuZ2Q8VkRFdDdVcCJjRlRjTSxUSCsnOCJoJV0rN1M8IjhOTFNHRzknaUNdSCJiLWJAP20zUEVWISJgaGxlUCVMOUM5OlV0LFVJZk0rcF09PStoUUNfVGJfTkZsXiM2XEheOyVKIzgwN1hnbTViXFJeWzAtRmxNSzZBRlg3RVo5JCdqVz1HOj02KjxvNDQqWXJBcipsRlJJPDtTaj1GOCJja2UnajEyK2tkLjluMi5OLSRJU3I1O0VKSGwzTHIjWiFTY11MIUQ3S25NZCk4MUonUWAkZjkxKGBAKzRGZzc3OEU7ZidYbl9hM1U7M25oVyRxNiUnSFxrbyYzTD9xKF5LI24sWzYnXUs4I0FwYFdHcGVWXU8tQWEjckpBVlNfcUciWzhmNC9tc047Im4jbCpHVC8vYGYjOC9eL2c5MVBUc1NeYTNqX242JGVoVldZWjIoKmZBU1hLTnNYJ0VtMnAkXztqcVIvWGRgcVdwNmxEOmc0MGYpRGBVXXBDJVwtT3BCb1Q2THNCLEdXKjUiaC04PGQ4TCkpLSRTbCtWajJTIl1fOyp1X2gvN0BzJGkiJTQpRUpCJjwxUVslKjkuVlxlXyM0UTBSPUkkPEhsJ3JsUnEnP2htM1JnTkZsOjcsXVAnO0FJUWRpRGciYXBMMyJRcFYqW1xdUVklaEQwWzZMKDgnXEU1TFwhU2ZENkFTNUlWQVQ0X15bNyppM3BmPig9VSRhK20iOzpabjQ4RWdsMGA4dE8mL2dDNSY3TSVpM1FTO1RlQUtwLSJLKm9INjpvSm5KRUVlSzAiaiNuXEpQRTRGWVNSPVVBUUdOLGdKMCZzIUM8KFlgNSpYSVhpOjQ9VytaRkNhSzhtNjhyZVUmTjEnMF8hS0s1S1xiTGk4c25acilqTi1bOkM4KGJDMyVOa0NJPCkkTSU7M1gpM2VwXS1QTUtGJS88Skk1KmMtQD9aTElYazc3OS9gIk87O2wlYjoiZ2JAPlVSYEpXMVpOcSRJZksmUUlpQGNbPmVSLTgsU09VNUlXSys3ak9gMyZDWmk9SGE7MmQrYCttJUBDLEs0IjsjSFZhTkM8YDVLKF1BV0hAJk9KX2ZFI2U0al46dWhbS0tJQV5nJU5CU1A9dVxnTjQkKDUzSHVpQ0t1biEkPUBkRiRIVDJYbFBnWEpXJF48bmV0cFdrMTBCZUc3KCkkSlFqcypoc1BROFI4Sz9zbDctaWJnN3FbZVhmRmw9ZE9Ga3NQJFtYKy1CL2dkXiJrWmgmZyFUWEdaXUBKX0lIJF9nI0dwbnBMS3UuKFlMcGxPJilnL2k6Y1w9RENzUEozRE5ecVdiMTkqREwhWCpiTilbXTRAdCxOTis2WydkUEZjVFhjKSIvX0VDSUFCRE4pUTgwZExdcmJvODw7c0U5KjFUbFd1OlRPLHRONzBKLVxZXm9QOl5BNlZaRmtCUmRnZGZvMjY2Yyc+Ly1qUXEsJm9uK2llZmtaZjwjRWMvWkFwYUBRJCs4VS1PUTBcWFFhZGJNNU1bMiNOP0gvYFxsZ21OLHJOVDgmQlhMNjhgTHEmcktSIyRzZzc9V1d1LFUoJGRvLj5FKG81WCFXKk5xRUJSKm8+YyJhNGgkLis3TlE/RG1ROkAvWWs3TCNCUm5lTW1QIXJyPjtYPTFTfj5lbmRzdHJlYW0KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDE4NTYKPj4Kc3RyZWFtCkdhdUhLZ04pJSwmOk4vM20lYD81QlMoR1MzbUFxMVAiYG5mKkYicSotY3VOWjY0c29vP2llVzNzMVNrSUE0aSs8VktIQnE5U2ptOChWPT4rKllQXklRZGwmISo4b29lYzxoNS0lYTo1KDROaUIxJ2hpODheSUcjSTEyczw7RyUoTV0mNl49aEBiY2FeKCd1Iz1NZF51Kio3b0NET0svdUksWzM0R25tUmlaJypqPjE0dGdcYT0ic1ZdXFMhVm4kRj0pdV9bbE5oYUpuTHVTRCpaLFhwWWttQGxIJTBNZDhGNk48Ol4nLEw6Rj5bWG1zcjldcCVCckVhKiMoXCUuNEEyPDJhMlsvP3VtK21wMVlQPC5bLFYoXkxSX2FVPyU6XVJnS2JAT0IyZVw+KkEvV3FxTmtyYyoucVFPRWFgNS9gTC4laT00LFtCKzlOYHRUVidVIi08WXFbWykrOHJCU0BjZ19sTzVcLEg4b0glJFEpNkpJZF0kNkYkL3QtKllQaXFuOj8jPjlHVEk7JTlrNG9cTDpVM18zbCE2LitlX1w/Lj0zcVVkcEY0PktuVkNKPlQ7VjhqVDs0NiQjXFdNWkw4Rllub2o3KChzOyQ/cD1RbmplWF02PUpFPlNAKU1YVSImcSppOnNwKUpUKy9rUSZHTGJANz1jLUs/b18hR3EjaTZyYF46JTIiJUApMCtxTlpTODNdVzZObGw7KmI1ZiJoR2ROLDU2RClxcypWdW9aKTJLOTlrQnNxWF1ZInN1VFRUPyVuXm4wXl1qUFFzZExOUC5bcU8/LiMvPCZWam5ZcVBuL0UtYTxAODtqUTMjVG5vWGtsOWRtPS9lPjRNaWs+JFpaQWFUTl41UD9tcyRHY0tALz0+UlpwbE5xNy0xTTRJXTlGOFg3ajBqc1VDTCpzWzpFJ0Fsa1gkc2RlKSYmcmNzQzgqKU5bXkw0QyZdPmlEbTYsXmlTUmZkIyZuKEVhYVVIciclRDFXO2NxcyQvdCRra2QoQlooWWtJPk1WOkguKm9ccjRpWCE7MEUtaiw5NUU8MkclbUxVMHI7YEY+TFY7L05uTkZBRW9aKTI5RzVRbV9CX14mRmw1SkJjYTwhbV44SV0+VD1ONUEsQCdwQzBaQkQlXDg2OEdsMWctPEtcXC9cWy04cFRyKU8qVFltbVgpST1JQFImVWo3cWZfcEpgclJbNG0yNWZkN0twQz1pXzo+YycmS1xaOj1SYUlBQVtOaDZhVWclJTFUbSwqYCZvdFVqVFFjL2Mrc1JuWj0vYi1Ha1NpTl9rRFckNz5mSThDRDxaRE9pT10/LDk+N0U6Qj0/LDBcPCwnWGhzQkFsJS9RcSRCcDY/PWFVLjtuKDk0QFQpX3FYOlI2X0ciIy5ea3FuRVhNPTlkIkg7PGBeYUQlR1wwJkReNVB0Y0lZREZcPlJcVUg2WWA2RmJQSis0ak1GXWdnS1U7MWw+cWJLSylgXzFbY2lhMWlgWE4tLG11Yiw8OyRgOVo8bT1KQlFeM3E9Sl1SclhMVTFvPzZDckNdXE5XSk9tZiQsWWJmTColTXFdTycwI3EoMS5YWDM0XUhSJVUkQydkXW4wXSNsS10hT3U1bkgvXTtrJ0ZTMj1hQTtodUkqaVJZSzEmOHQqMUYuTDs+YWsxPjIraD9bZjJTYC9PUWlRMSRUM3JjWTFsYyhwbypubikoZUtEUCxzQERNbGhwaj1PblFqOWJeME5XZU4wT2BxQjpcT2xgPG5IU1cpPysnRUxGNSFDXlYmQDs9Ik5bdSIkYl5WR0xPN1dPIUpzIy9lOjVdZHQ0ZjplPlFLb1Y0PWhZb3I5bWM8QTNxKjMpLmA1I2tTYCZbMzs6alw2cDlra1lta2YqYipCPDIoQEVsJ0pFaS5GaTdAXHMtMTQ4JkJXOT1lLUhgW21qRVRdTlwmZlZobGdbcFshWjw/J0xocFIqQ25aOERxVkQzdF5ZSk47Z0JIXjcvWzFkWmE4VlRCWyZVLUNkLkRYY1pmXjlgMEZYSVVwLTJndEtHPEVZJ3A1bzJrL0MrXVwnK0VqTl48V1phakxYI0YrZFgyZDYkRzo+YD0+VGIjLEZlamo/XTExaDQoKW1caENJOG81M1wvVz1dTSoua05IPnFbJGUiUFM7LFgkZT5aPSVnJmFHaE9DdDVENjQlVih0PmZcUFAkIyguW3BIXDhXLFsxM2YlbnI5J1glZWU8dE5BOGhpMXNhWV5GXk9eSmhPS1ZGbFRHNyQnYTRIMCgnRFUkMylkZThZYEBDN2UqaFtFPEhRZzRsQnE8RiRhZnE2a3A4L1g8VjQjamktJVMxTUs1QCJYKjx1OGY5KmJTXjpwV0g7bVtRaFg/YVNTM0FwO0RrYnBpZ3FdIUxnY09IOVtXIUp1ZlRLXmJaRl9AYF48ajBMWk9dWFpmXVhlSE5PXVYlRl1XZUUsdUttXj4jcjBfdV8oL0IsN34+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTMKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMjIgMDAwMDAgbiAKMDAwMDAwMDIyOSAwMDAwMCBuIAowMDAwMDAwMzQxIDAwMDAwIG4gCjAwMDAwMDA0NjAgMDAwMDAgbiAKMDAwMDAwMDU3NSAwMDAwMCBuIAowMDAwMDAwNzgwIDAwMDAwIG4gCjAwMDAwMDA5ODUgMDAwMDAgbiAKMDAwMDAwMTA1NCAwMDAwMCBuIAowMDAwMDAxNDA4IDAwMDAwIG4gCjAwMDAwMDE0NzQgMDAwMDAgbiAKMDAwMDAwMzU3MSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzxmOTAwNTJmM2UxODgxZWYwMDA0YTZiMWI0NTc5MDRhMD48ZjkwMDUyZjNlMTg4MWVmMDAwNGE2YjFiNDU3OTA0YTA+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDkgMCBSCi9Sb290IDggMCBSCi9TaXplIDEzCj4+CnN0YXJ0eHJlZgo1NTE5CiUlRU9GCg==";

  function _buildDefaultDB() {
    return [
      {
        id: "pyq_sample_html_2024",
        title: "Web Design (HTML)",
        subject: "Web Design",
        branch: "cse",
        branchName: "Computer Science & Engineering",
        semester: "2",
        year: "2024",
        examType: "end",
        examTypeLabel: "End Semester",
        filename: "HTML_CSE_Sem2_2024_EndSem.pdf",
        uploadedBy: "system",
        uploadedAt: "2024-11-01",
        pages: 2,
        questions: SAMPLE_QUESTIONS,
        fileData: SAMPLE_PDF_B64
      }
    ];
  }

  function _init() {
    try {
      if (!localStorage.getItem(STORE_KEY)) {
        localStorage.setItem(STORE_KEY, JSON.stringify(_buildDefaultDB()));
      }
    } catch(e) { console.error('PYQDatabase init:', e); }
  }

  function getAll() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch { return []; }
  }

  function query({ branch, semester, subject, examType, year, search } = {}) {
    let r = getAll();
    if (branch)   r = r.filter(p => p.branch   === branch);
    if (semester) r = r.filter(p => p.semester === String(semester));
    if (subject)  r = r.filter(p => p.subject.toLowerCase().includes(subject.toLowerCase()));
    if (examType) r = r.filter(p => p.examType === examType);
    if (year)     r = r.filter(p => p.year     === String(year));
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(p =>
        p.title.toLowerCase().includes(q)      ||
        p.subject.toLowerCase().includes(q)    ||
        (p.branchName||'').toLowerCase().includes(q) ||
        p.branch.toLowerCase().includes(q)     ||
        p.year.includes(q)                     ||
        (p.examTypeLabel||'').toLowerCase().includes(q) ||
        (p.questions||[]).some(qn => qn.text.toLowerCase().includes(q))
      );
    }
    r.sort((a,b) => Number(b.year)-Number(a.year) || a.title.localeCompare(b.title));
    return r;
  }

  function add({ title, subject, branch, branchName, semester, year, examType, examTypeLabel, filename, uploadedBy, fileData, questions, pages }) {
    const db = getAll();
    const BRANCH_NAMES = {
      cse:'Computer Science & Engineering', ece:'Electronics & Communication',
      me:'Mechanical Engineering', ee:'Electrical Engineering',
      ce:'Civil Engineering', it:'Information Technology',
      che:'Chemical Engineering', mca:'MCA', mba:'MBA'
    };
    const entry = {
      id: 'pyq_' + Date.now(),
      title, subject,
      branch, branchName: branchName || BRANCH_NAMES[branch] || branch.toUpperCase(),
      semester: String(semester), year: String(year),
      examType,
      examTypeLabel: examTypeLabel || (examType === 'end' ? 'End Semester' : 'Mid Semester'),
      filename, uploadedBy,
      uploadedAt: new Date().toISOString().split('T')[0],
      pages:     pages     || 1,
      questions: questions || [],
      fileData:  fileData  || ''
    };
    db.push(entry);
    localStorage.setItem(STORE_KEY, JSON.stringify(db));

    // ── Save notification so student dashboard picks it up ──
    try {
      const NOTIF_KEY = 'nitkkr_notifications';
      const notifs = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
      notifs.unshift({
        id:      'notif_' + Date.now(),
        type:    'new_paper',
        icon:    '📄',
        text:    'New question paper uploaded: ' + title +
                 ' (' + (branchName || branch.toUpperCase()) + ' • Sem ' + semester +
                 ' • ' + (examTypeLabel || (examType === 'end' ? 'End Semester' : 'Mid Semester')) +
                 ' ' + year + ')',
        subject: subject,
        branch:  branch,
        semester: String(semester),
        paperId: entry.id,
        time:    new Date().toISOString(),
        read:    false,
      });
      localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
    } catch(e) {}

    return entry;
  }

  function getById(id) { return getAll().find(p => p.id === id) || null; }
  function remove(id)   { localStorage.setItem(STORE_KEY, JSON.stringify(getAll().filter(p=>p.id!==id))); }
  function reset()      { localStorage.setItem(STORE_KEY, JSON.stringify(_buildDefaultDB())); }

  _init();
  return { getAll, query, add, getById, remove, reset, SAMPLE_QUESTIONS };

})();