# AUMS Assignment & Attendence Aggregator
AUMS Assignment & Attendence Aggregator (very geniously titled AAAA, because its the exact sound I make everytime I open AUMS) is a firefox extension desigined to minimize interaction with AUMS, the Amrita University Management System, for Amrita Vishwa Vidyapeetham. Currently, it only works for the Amritapuri version, as it was only designed for it.

AAAA allows you to view all your course assignments in one page, so you need not go thorugh each and every subject assignment page to check for any assignment update. It also showcases your available tests & quizzes, along with an auto-refresh button, so you wouldn't have to refresh the page everytime to see if your quiz is available. It also shows your current attendence for all semesters in a table format.

AAAA doesn't
- Show your course-wise attendence pdf when going through your attendence data
- View data from Your Grades or Your Marks yet.

## Instructions for use
1. Download the AAAA.xpi file from Releases, and follow the instructions for installation.
2. Once installed, click on your extension icon in the toolbar and you will be met with a sign in window.
3. Type in your AUMS username and password in the required places, and press on submit.
4. After a while, you will be met with the page showcasing all your current courses' assignments and assessments, under the tab Assignments & Assessments.
  
   ![image](https://github.com/user-attachments/assets/066e8173-7cbf-47f6-a2a3-ba691d5befab)

An example course. You may notice its titled using your course code. To make it use your course name, you may click on the rename button to the right and it will persist your changes everytime you open the extension. Once an assignment is added, it would be filled with details from the same table in your Assignments page, such as Attachments, Assignment, Title, Status, Open Date and Due Date.

Under the assessments section, you would find a button titled retry. This auto refreshes your Tests & Quizzes page for that particular course to check for an update. 

If at the start of a new semester, the courses that are viewable in your extension has to be updated, a button titled "Re-get Courses" at the end of the page will go through the website again to get the new course links.

5. To view your attendence for each semester, click on the Attendence tab. You will be met with an empty table before choosing a semester. Choose a semester from the dropdown and the table will be autofilled with your current attendence numbers for that particular semester. Note: the following data has been censored for privacy reasons.

   ![image](https://github.com/user-attachments/assets/fb715386-3b32-4062-9c56-1e6862427793)

The extension automatically saves your last choice for the attendence dropdown, and will autofill it everytime you open it again.
> Note: its a known bug that the attendence table may not autofill the first time you're choosing your semester.
