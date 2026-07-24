Short version: you probably want the other stickiness type. The "app cookie name" it's asking for only works if our service sets that cookie — and right now it doesn't. So application-based stickiness won't actually stick until we add the cookie.

Here's the distinction:

"Load balancer generated cookie" (duration-based) — the ALB creates and manages its own AWSALB cookie. No app cookie name, no code change. It just works with what we already have (our payment page sends credentials: 'include'). This is the one I'd use.
"Application-based cookie" — the ALB only sticks when your application returns a cookie with the name you type in. Our EFT service doesn't set any cookie today, so this box would point at a cookie that never exists → no stickiness.
Recommendation
Switch the target group's stickiness type back to "Load balancer generated cookie", set the duration to about 1 hour (longer than a payment session), and save. That's the whole fix — no cookie name, nothing to deploy on our side.

If you'd rather keep application-based
It's doable, just needs a small code change: I'd make the EFT service set a cookie (say EFTSTICK) on its responses, and you'd enter that exact name in the ALB. It gives slightly tighter control (the cookie lives exactly as long as the session), but for our case the load-balancer-generated option is simpler and equally effective.

Want me to:

Nothing on my side — you switch to "Load balancer generated cookie" and we're done, or
Add the EFTSTICK cookie to the EFT service so application-based works (then you'd enter EFTSTICK as the name)?
Either way, once stickiness is on, the split-across-instances failure (setup landing on the wrong EC2) stops happening. And I'd still suggest committing the safety-net change so any rare stray request fails cleanly instead of the 60-second blank timeout — say the word and I'll commit it.