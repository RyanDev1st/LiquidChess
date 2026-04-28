The landing page is to be started with design\desktop-web\components\hook. The implementation has already been outlined within the hook.md there, proceed with it and connect with the next part. 

The following will list each section of the landingpage and the corresponding component design files to be used for each section. I want the page to be section-snap EXCEPT FOR the transition from the hero-section to the demo-section, the snap should be akin to slides. So each section will take up the entire viewport and the user can scroll down to the next section, or scroll back up to the previous section.

Read through exactly the md files for each section and follow the instructions and strictly use the assets in the specified directories to create the components. The design and implementation should be ready for integration as soon as the assets are put in place. 

# 1. Hero section:
-Use the component design\desktop-web\components\hero-section\hero.md

# 2. Voice showcase section:
-Use the component design\desktop-web\components\voice-showcase\showcase.md

# 3. Demo section:
-Use the component design\desktop-web\components\demo-section\demo.md

# 4. Testimonial section:
-Use the component design\desktop-web\components\testimonial\testimonial.md -> MAKE THIS SPAN THE ENTIRE WIDTH OF THE PAGE. The specs of the .md has that on hover the marquee effect will stop. I want you to add in that on hover the card will also slightly expand. 

# 5. Call to action section:
This will be the final section of the landing page, with a strong call to action for users to sign up or learn more about the product. You can use a simple design with a headline, a subheadline, and a prominent button that stands out.

Start with snapping in(enlarging) the 2 models from the hero section, standing before and flanking, looking at a 2D screen which plays a video. The video will play a short 3-second video and the models will comment "what are you waiting for, join us now!" in sync with the video. Then ends the video and shows up a "Get Started" button.
# 6. FAQ section:

Make this a simple accordion style FAQ section. You can use the same design as the expand cards component from 21st.dev, but instead of cards, it will be questions that expand to show the answers when clicked.

# 7. Footer section:
Use the component design\desktop-web\components\footer\footer.md for the footer section. This will include links to social media, contact information, and any other relevant links or information about the company.

# ----Rules----:
- Use the nav-bar from src\design\desktop-web\components\menu-bar
- Prioritize visuals over text. Keep the text concise and impactful. The visuals should do most of the storytelling.
- Make sure the design is responsive and looks good on both desktop and mobile devices.
- For links, use @src\design\desktop-web\components\hoverpeek
- For tool-tip use @src\design\desktop-web\components\tool-tip
- Add a loading layer as a priority in the event of page not loaded in. Show a blank layout instead of a blank screen to give a feeling of "loaded" to the users. 
- Compress videos and 3D models for lower-end devices, but make sure they still look good and serve their purpose. 
- Remember our brand is Liquid Chess. The components will have the name of the authors who designed them in the comments, but make sure to adapt the design to fit the overall aesthetic and theme of Liquid Chess.
- Strictly follow the md files AND use the assets in the specified directories. The design and implementation should be ready for integration as soon as the assets are put in place.
# References:

src\design\reference\landing-page\LiquidChess.html

This is what I made. It is vanilla and not good enough yet. But you could take a look to see my standards.