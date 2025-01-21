debug = false

function print(x)
{
    console.log(x)
}

async function notSignedIn() {
    try {
        const response = await fetch('https://aumsam.amrita.edu/portal/login');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.text();
        const executionValue = extractExecutionValue(data);
        if (executionValue) {
            console.log("User is not signed in.");
            return true;
        }
        else {
            console.log("User is already signed in.");
            return false;
        }

    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        return false;
    }
}

function refreshLink() {

}

function signinPrompt() {
    document.getElementById("overlay").classList.remove("hidden");

    return new Promise((resolve) => {
        document.getElementById("submit").addEventListener("click", function onSubmit() {
            document.getElementById("submit").removeEventListener("click", onSubmit);

            const user = document.getElementById("username").value;
            const pass = document.getElementById("password").value;
            browser.storage.local.set({ user: user });
            browser.storage.local.set({ pass: pass });

            document.getElementById("overlay").classList.add("hidden");

            resolve({ user, pass });
        });
    });
}

async function getCredentials() {
    if (debug == true){
        const credentials = await signinPrompt();
        return credentials;
    }
    try {
        const result = await browser.storage.local.get(['user', 'pass']);
        const user = result.user;
        const pass = result.pass;
        if (!user || !pass) {
            const credentials = await signinPrompt();
            return credentials;
        }

        return { user, pass };
    } catch (error) {
        console.error('Error retrieving data:', error);
        return await signinPrompt();
    }
}

async function scrapeCourseLinks() {
    //  if (await notSignedIn()) {
    //      await signInToAUMS();
    // }

    return fetch('https://aumsam.amrita.edu/portal/login')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(async data => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/html');
            let courseLinks = [];
            const links = Array.from(doc.querySelectorAll('.link-container'));
            const result = links.reduce((acc, link) => {
                const id = link.href.split('/').pop();
                const title = link.title.slice(-8);
                acc[title] = id;
                return acc;
            }, {});

            if (Object.keys(result).length === 0) {
                console.error("Something went wrong with https://aumsam.amrita.edu/portal/login Trying again.");
            }
            for (let i = 1; i < links.length; i++) {
                const link = links[i];
                const siteId = result[link.title.slice(-8)];

                const url = `https://aumsam.amrita.edu/direct/site/${siteId}/pages.json`;

                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const jsonData = await response.json();

                    const assignment = jsonData[7];
                    const assessment = jsonData[8];

                    courseLinks.push({
                        title: link.title.slice(-8),
                        assignment: assignment.url,
                        assessment: assessment.url
                    });
                } catch (error) {
                    console.error(`Failed to fetch data for ${link.title}:`, error);
                }
            }
            browser.storage.local.set({ courseLinks: courseLinks });
            return courseLinks;
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}

async function signInToAUMS() {

    if (!await notSignedIn()) return;

    const { user, pass } = await getCredentials();

    const requestURL = "https://aumsam.amrita.edu/cas/login";

    try {
        const response = await fetch(requestURL);
        const data = await response.text();
        const executionValue = extractExecutionValue(data);
        if (!executionValue) {
            console.error("Execution value not found.");
            return;
        }

        const newRequestBody = new URLSearchParams({
            username: user,
            password: pass,
            execution: executionValue,
            _eventId: 'submit',
            submit: 'LOGIN'
        }).toString();

        await performLogin(newRequestBody);
    } catch (error) {
        if (error.name === 'TypeError') {
            console.error("Network error or request failed:", error);
        } else {
            console.error("Error during sign-in:", error);
        }
    }
}

function extractExecutionValue(data) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(data, "text/html");
    const executionInput = doc.querySelector('input[name="execution"]');
    const executionValue = executionInput ? executionInput.value : null;
    return executionValue;
}

async function performLogin(body) {
    const requestOptions = {
        credentials: "include",
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "Sec-GPC": "1",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Priority": "u=0, i"
        },
        referrer: "https://aumsam.amrita.edu/cas/login",
        body: body,
        method: "POST",
        mode: "cors",
        redirect: 'manual'
    };

    const loginURL = "https://aumsam.amrita.edu/cas/login";

    try {
        const response = await fetch(loginURL, requestOptions);
        var data = await response.text();
        if (data.includes("Invalid credentials")) {
            console.error("Invalid credentials. Try again.");
            browser.storage.local.remove(['user', 'pass']);
            await signInToAUMS();
        }
    } catch (error) {
        console.error("Error during login:", error);
    }
}

async function getCourseLinks() {
    if(debug == true)
    {
        try {
            const courseLinks = await scrapeCourseLinks();
            return courseLinks;
        } catch (scrapeError) {
            console.error('Error scraping courseLinks:', scrapeError);
            return null;
        }
    }
    
    try {
        var result = await browser.storage.local.get(['courseLinks']);

        if (result.courseLinks && Array.isArray(result.courseLinks) && result.courseLinks.length > 0) {
            console.log("courseLinks found within persistent storage");
            return result.courseLinks;
        } else {
            console.log("Trying for courseLinks by manual scraping");
            try {
                const courseLinks = await scrapeCourseLinks();
                return courseLinks;
            } catch (scrapeError) {
                console.error('Error scraping courseLinks:', scrapeError);
                return null;
            }
        }
    } catch (error) {
        console.error('Error retrieving data:', error);
        return null;
    }
}


async function fetchAssignmentContent(url) {
    const response = await fetch(url);
    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const mainContent = doc.querySelector('main[id="content"]');

    const head = mainContent.querySelector('h1')?.outerHTML || '';
    const contentSelectors = ['.sak-banner-info', '.table-responsive'];

    let content = contentSelectors.map(selector => mainContent.querySelector(selector))
        .find(el => el)?.outerHTML || 'No Content Found';

    return head + content;
}

async function fetchAssessmentContent(url) {
    const response = await fetch(url);
    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const submissionContainer = doc.querySelector('.submission-container');
    const clearfix = doc.querySelector('.clearfix');
    let content = submissionContainer.innerHTML + clearfix.innerHTML || 'No Content Found';
    return content;
}

async function renameTitle(index) {
    const title = document.getElementById(`title_${index}`);
    const originalText = title.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.style.width = `${title.offsetWidth}px`;
    input.className = title.className;

    title.replaceWith(input);
    input.focus();

    input.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== originalText) {
                title.textContent = newTitle;
                const courseLinks = await getCourseLinks();
                courseLinks[index].title = newTitle;
                browser.storage.local.set({ courseLinks: courseLinks });
            }
            input.replaceWith(title);
        } else if (event.key === 'Escape') {
            input.replaceWith(title);
        }
    });

    input.addEventListener('blur', () => {
        input.replaceWith(title);
    });
}


async function displayAllContent() {
    await signInToAUMS();
    const container = document.getElementById('contentContainer');
    container.innerHTML = '';
    getCourseLinks().then(async (courseLinks) => {
        for (let i = 0; i < courseLinks.length; i++) {
            const link = courseLinks[i];
            const section = document.createElement('div');
            section.className = 'content-section fade';
            section.style.transitionDelay = `${i * 0.2}s`;

            section.setAttribute('tabindex', '0');

            section.addEventListener('focus', () => {
                section.classList.add('focus-within');
            });

            section.addEventListener('blur', () => {
                section.classList.remove('focus-within');
            });

            section.addEventListener('focusin', () => {
                section.classList.add('focus-within');
            });

            section.addEventListener('focusout', (event) => {
                if (!section.contains(event.relatedTarget)) {
                    section.classList.remove('focus-within');
                }
            });

            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'section-header';
            const title = document.createElement('div');
            title.id = `title_${i}`;
            title.className = 'section-title';
            title.textContent = link.title;
            sectionHeader.appendChild(title);

            const renameButton = document.createElement('button');
            renameButton.textContent = 'Rename';
            renameButton.className = 'rename-button';
            renameButton.id = `renameButton_${i}`;
            renameButton.addEventListener('click', () => {
                renameTitle(i)
            });
            sectionHeader.appendChild(renameButton);

            section.appendChild(sectionHeader);
            const contentContainer = document.createElement('div');
            contentContainer.className = 'course-content-container';

            try {
                // Assignment section
                if (link.assignment) {
                    const assignmentSection = document.createElement('div');
                    assignmentSection.className = 'assignment-section';

                    const assignmentHeading = document.createElement('h3');
                    assignmentHeading.textContent = '';
                    assignmentHeading.className = 'content-subtitle';
                    assignmentSection.appendChild(assignmentHeading);

                    const assignmentSpinner = document.createElement('div');
                    assignmentSpinner.className = 'spinner-border text-primary mb-3';
                    assignmentSpinner.setAttribute('role', 'status');
                    assignmentSpinner.setAttribute('aria-label', 'Loading assignment content');
                    assignmentSection.appendChild(assignmentSpinner);

                    const assignmentContent = document.createElement('div');
                    const content = await fetchAssignmentContent(link.assignment);
                    assignmentContent.innerHTML = content;

                    const interactiveElements = assignmentContent.querySelectorAll('a, button, input, select, textarea');
                    interactiveElements.forEach(element => {
                        if (!element.hasAttribute('tabindex')) {
                            element.setAttribute('tabindex', '0');
                        }
                    });

                    assignmentSection.appendChild(assignmentContent);
                    assignmentSpinner.remove();
                    contentContainer.appendChild(assignmentSection);
                }

                // Assessment section
                if (link.assessment) {
                    const assessmentSection = document.createElement('div');

                    assessmentSection.className = 'assessment-section';

                    const assessmentHeading = document.createElement('h3');
                    assessmentHeading.textContent = '';
                    assessmentHeading.className = 'content-subtitle';
                    assessmentSection.appendChild(assessmentHeading);

                    const assessmentSpinner = document.createElement('div');
                    assessmentSpinner.className = 'spinner-border text-primary mb-3';
                    assessmentSpinner.setAttribute('role', 'status');
                    assessmentSpinner.setAttribute('aria-label', 'Loading assessment content');
                    assessmentSection.appendChild(assessmentSpinner);

                    const assessmentContent = document.createElement('div');
                    const content = await fetchAssessmentContent(link.assessment);
                    assessmentContent.innerHTML = content;

                    const interactiveElements = assessmentContent.querySelectorAll('a, button, input, select, textarea');
                    interactiveElements.forEach(element => {
                        if (!element.hasAttribute('tabindex')) {
                            element.setAttribute('tabindex', '0');
                        }
                    });

                    assessmentSection.appendChild(assessmentContent);
                    assessmentSpinner.remove();
                    contentContainer.appendChild(assessmentSection);

                    // Retry button and countdown
                    const retryButton = document.createElement('button');
                    retryButton.textContent = 'Retry';
                    retryButton.className = 'btn btn-primary retry-button';
                    assessmentSection.appendChild(retryButton);

                    const countdown = document.createElement('span');
                    countdown.className = 'countdown ms-2';
                    assessmentSection.appendChild(countdown);

                    let retryInterval;
                    retryButton.addEventListener('click', function handleRetryClick() {
                        retryButton.removeEventListener("click", handleRetryClick);
                        let seconds = 10;
                        countdown.textContent = `Retrying in ${seconds} seconds...`;
                        retryInterval = setInterval(async () => {
                            seconds--;
                            if (seconds > 0) {
                                countdown.textContent = `Retrying in ${seconds} seconds...`;
                            } else {
                                seconds = 10;
                                countdown.textContent = `Retrying in ${seconds} seconds...`;
                                const newContent = await fetchAssessmentContent(link.assessment);
                                assessmentContent.innerHTML = newContent;
                            }
                        }, 1000);
                    });
                }
            } catch (error) {
                const errorMessage = `Error loading content. Make sure to <a href="https://aumsam.amrita.edu/cas/login">sign in</a> on the website.`;
                contentContainer.innerHTML = errorMessage;
                console.error('Error fetching content:', error);
            }

            section.appendChild(contentContainer);
            container.appendChild(section);

            setTimeout(() => {
                section.classList.add('show');
            }, 100);
        }

        const button = document.createElement('button');
        button.textContent = 'Re-get courses';
        
        button.style.padding = '5px 10px';
        button.style.fontSize = '16px';
        button.style.backgroundColor = '#D84B16';
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.borderRadius = '8px';
        button.style.cursor = 'pointer';
        button.style.transition = 'background-color 0.3s ease';
        
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#B34011';
        });
    
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = '#D84B16';
        });
    
        container.appendChild(button);
    
        button.addEventListener('click', () => {
            browser.storage.local.remove('courseLinks').then(() => {
                console.log('courseLinks removed from storage');
                displayAllContent();
            }).catch((error) => {
                console.error('Error removing courseLinks:', error);
            });
        });

    });    

}

async function fetchAndExtractTableData(semester) {

    const attendenceURL = "https://aumsam.amrita.edu/aums/Jsp/Attendance/AttendanceReportStudent.jsp?action=UMS-ATD_INIT_ATDREPORTSTUD_SCREEN&isMenu=true"

    try {
        const response = await fetch(attendenceURL);
        if (!response.ok) {
            console.error("Failed to fetch attendance page:", response.status, response.statusText);
            return [];
        }
        const text = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const dropdown = doc.querySelector('select[name="htmlPageTopContainer_selectSem"]');
        if (!dropdown) {
            console.error("Semester select dropdown not found.");
            return [];
        }

        var targetIndex = semester;
        for (let i = 0; i < dropdown.options.length; i++) {
            dropdown.options[i].removeAttribute("selected");
        }
        dropdown.options[targetIndex].setAttribute("selected", "");
        
        var input = doc.querySelector('input[name="htmlPageTopContainer_action"]');
        if (!input) {
            console.error("Hidden input field not found.");
            return [];
        }
        input.value = "UMS-ATD_SHOW_ATDSUMMARY_SCREEN";

        const form = doc.forms[0];
        if (!form) {
            console.error("Form not found.");
            return [];
        }
        form.target = "_self"

        // Serialize form data as application/x-www-form-urlencoded
        const formData = new FormData(form);
        const urlEncodedData = new URLSearchParams([...formData]).toString();

        // Send the POST request
        const rresponse = await fetch("https://aumsam.amrita.edu/aums/Jsp/Attendance/AttendanceReportStudent.jsp?action=UMS-ATD_INIT_ATDREPORTSTUD_SCREEN&isMenu=true&pagePostSerialID=0", {
            method: "POST",
            body: urlEncodedData,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            credentials: "include", // Include cookies for session management
            referrer: "https://aumsam.amrita.edu/aums/Jsp/Attendance/AttendanceReportStudent.jsp?action=UMS-ATD_INIT_ATDREPORTSTUD_SCREEN&isMenu=true&pagePostSerialID=0",
        });

        if (!rresponse.ok) {
            console.error("Failed to submit form:", rresponse.status, rresponse.statusText);
            return [];
        }

        const response_data = await rresponse.text();
        const newdoc = parser.parseFromString(response_data, "text/html");

        const rows = newdoc.querySelectorAll("div#arrearreport table tr");
        const attendanceData = [];

        rows.forEach((row, index) => {
            if(index == 0)
            {
                return;
            }
            const cells = row.querySelectorAll("td");
            if (cells.length >= 8) {
                const courseName = cells[1].textContent.trim();
                if (courseName) {
                    const noOfClasses = cells[5].textContent.trim();
                    const classesAttended = cells[6].textContent.trim();
                    const percentage = cells[7].textContent.trim();
                    attendanceData.push({ courseName, noOfClasses, classesAttended, percentage });
                }
            }
        });

        return attendanceData;
    } catch (error) {
        console.error("Error during fetch or processing:", error);
        return [];
    }
}

async function createAttendanceTables(semester, container) {
    try {
        const attendanceData = await fetchAndExtractTableData(semester);
        const table = document.createElement('table');
        table.className = 'table table-striped table-bordered';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Course Name</th>
                <th>No. of Classes</th>
                <th>Classes Attended</th>
                <th>Percentage</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        attendanceData.forEach((data, index) => {
            const row = document.createElement('tr');
            row.className = index % 2 === 0 ? 'table-teal' : 'table-orange';
            row.innerHTML = `
                <td>${data.courseName}</td>
                <td>${data.noOfClasses}</td>
                <td>${data.classesAttended}</td>
                <td>${data.percentage}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    } catch (error) {
        container.innerHTML = 'Error loading attendance data.';
        console.error('Error fetching attendance data:', error);
    }
}

async function displayAttendanceContent() {
    const container = document.getElementById('attendanceContainer');
    container.innerHTML = '';


    const label = document.createElement('label');
    label.setAttribute('for', 'semesterDropdown');
    label.textContent = 'Semesters: ';
    label.style.fontSize = '18px'; // Make label text bigger
    label.style.marginRight = '10px'; // Add some spacing between label and dropdown

    const dropdown = document.createElement('select');
    dropdown.id = 'semesterDropdown';

    // Apply styles to the dropdown to make it look better
    dropdown.style.fontSize = '16px'; // Increase font size
    dropdown.style.padding = '8px'; // Add padding for a larger clickable area
    dropdown.style.borderRadius = '5px'; // Rounded corners
    dropdown.style.border = '1px solid #ccc'; // Subtle border
    dropdown.style.backgroundColor = '#f9f9f9'; // Light background
    dropdown.style.boxShadow = '0px 2px 5px rgba(0, 0, 0, 0.1)';
    dropdown.style.marginBottom = '15px';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a semester';
    dropdown.appendChild(defaultOption);

    for (let i = 1; i <= 8; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i}`;
        dropdown.appendChild(option);
    }

    container.appendChild(label);
    container.appendChild(dropdown);

    (async function setDefaultDropdownValue() {
        const storedSemester = await browser.storage.local.get('selectedSemester');
        if (storedSemester.selectedSemester) {
            dropdown.value = storedSemester.selectedSemester; // Set the dropdown value
        } else {
            dropdown.value = ''; // Default value if none is stored
        }
        
        // Call changeTableData after setting the default value
        changeTableData(dropdown, tableContainer);
    })();
    
    const tableContainer = document.createElement('div');
    
    // Function to change table data based on the selected dropdown value
    function changeTableData(dropdown, tableContainer) {
        const selectedValue = dropdown.value;
        tableContainer.innerHTML = ''; // Clear the table container
        if (selectedValue) {
            createAttendanceTables(selectedValue, tableContainer); // Populate table based on the selected value
        }
    }
    
    // Attach an event listener to handle dropdown changes
    dropdown.addEventListener('change', async () => {
        const selectedValue = dropdown.value;
        await browser.storage.local.set({ selectedSemester: selectedValue }); // Save the selected value
        changeTableData(dropdown, tableContainer); // Update table data
    });

    container.appendChild(tableContainer);

}

document.addEventListener('DOMContentLoaded', () => {
    if (debug == true) {
        browser.storage.local.set({
            courseLinks: null,
            user: null,
            pass: null,
            selectedSemester: null
        });
    }
    displayAllContent();
    displayAttendanceContent();

    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            tab.classList.add('active');
            if (tabContents[index]) {
                tabContents[index].classList.add('active');
            }
        });
    });
});
